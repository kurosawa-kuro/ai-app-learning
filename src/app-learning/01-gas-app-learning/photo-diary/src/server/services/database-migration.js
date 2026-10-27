/** 旧表を保持してv2へコピー。外部ファイルの変更・自動切替はしない。 */
const DatabaseMigration = {
  plan() {
    const old = SheetStore.legacy(),
      issues = [],
      target = Object.fromEntries(Object.keys(TABLES).map((n) => [n, []]))
    const unique = (rows, keys, label) => {
      const used = new Set()
      rows.forEach((r) => {
        const key = JSON.stringify(keys.map((k) => String(r[k])))
        if (used.has(key)) issues.push(label + ":duplicate")
        used.add(key)
      })
    }
    for (const [n, rows] of Object.entries(old))
      unique(rows, n === "post_tags" ? ["post_id", "tag_id"] : [LEGACY_TABLES[n][0]], n)
    old.posts.forEach((r) => {
      if (
        typeof r.title !== "string" ||
        typeof r.body !== "string" ||
        !(r.created_at instanceof Date) ||
        !isFinite(r.created_at.getTime())
      )
        issues.push("posts:invalid_type")
    })
    old.uploads.forEach((r) => {
      if (
        !/^[a-f0-9]{64}$/.test(String(r.sha256)) ||
        !["image/jpeg", "image/png"].includes(r.mime_type) ||
        !Number.isInteger(Number(r.byte_size)) ||
        Number(r.byte_size) < 1 ||
        !(r.created_at instanceof Date)
      )
        issues.push("uploads:invalid_metadata")
    })
    const posts = new Set(old.posts.map((r) => String(r.id))),
      tags = new Set(old.tags.map((r) => String(r.id))),
      files = new Map()
    const now = ""
    PhotoService.providers_()
      .dummy.catalog()
      .forEach((p) => {
        files.set(p.file_id, p.file_id)
        target.assets.push({
          id: p.file_id,
          storage_kind: "dummy",
          storage_key: p.file_id,
          state: "ready",
          created_at: now,
          updated_at: now,
        })
      })
    old.uploads.forEach((r) => {
      const id = "legacy-upload-" + String(r.upload_id),
        key = String(r.file_id)
      if (key && files.has(key)) issues.push("uploads:ambiguous_file")
      if (!["pending", "ready", "trashed"].includes(r.state) || (r.state === "ready" && !key))
        issues.push("uploads:invalid_state")
      if (key) files.set(key, id)
      const recovery = DriveStore.name(r)
      target.assets.push({
        id,
        storage_kind: "drive",
        storage_key: key,
        recovery_key: recovery,
        sha256: String(r.sha256),
        mime_type: String(r.mime_type),
        byte_size: r.byte_size,
        state: r.state,
        created_at: r.created_at,
        updated_at: "",
      })
      target.upload_requests.push({
        upload_id: String(r.upload_id),
        asset_id: id,
        payload_hash: payloadHash_({ version: 2, digest: String(r.sha256), mime: String(r.mime_type) }),
        recovery_key: recovery,
        state: r.state === "pending" ? "pending" : "succeeded",
        created_at: r.created_at,
        updated_at: "",
      })
    })
    old.posts.forEach((r) => target.posts.push({ ...r, id: String(r.id), source_generation_id: "" }))
    old.tags.forEach((r) => target.tags.push({ id: String(r.id), name: String(r.name) }))
    old.images.forEach((r) => {
      if (!files.has(String(r.file_id))) issues.push("images:missing_asset")
      if (!Number.isInteger(Number(r.sort_order)) || Number(r.sort_order) < 1) issues.push("images:invalid_order")
      if (!posts.has(String(r.post_id)) && !old.requests.some((q) => String(q.post_id) === String(r.post_id)))
        issues.push("images:unrecoverable_parent")
      target.post_assets.push({
        id: String(r.id),
        post_id: String(r.post_id),
        asset_id: files.get(String(r.file_id)) || "",
        sort_order: Number(r.sort_order),
      })
    })
    old.post_tags.forEach((r) => {
      if (!tags.has(String(r.tag_id))) issues.push("post_tags:missing_tag")
      if (!posts.has(String(r.post_id)) && !old.requests.some((q) => String(q.post_id) === String(r.post_id)))
        issues.push("post_tags:unrecoverable_parent")
      target.post_tags.push({ post_id: String(r.post_id), tag_id: String(r.tag_id) })
    })
    old.requests.forEach((r) =>
      target.post_create_requests.push({
        request_id: String(r.request_id),
        post_id: String(r.post_id),
        payload_hash: "",
        state: posts.has(String(r.post_id)) ? "succeeded" : "legacy_pending",
        created_at: "",
        updated_at: "",
      })
    )
    unique(target.assets, ["id"], "assets")
    unique(target.post_assets, ["post_id", "asset_id"], "post_assets")
    unique(target.post_assets, ["post_id", "sort_order"], "post_assets_order")
    unique(target.post_create_requests, ["post_id"], "requests_post")
    const countsByPost = new Map()
    target.post_assets.forEach((r) => {
      const list = countsByPost.get(r.post_id) || []
      list.push(r.sort_order)
      countsByPost.set(r.post_id, list)
    })
    countsByPost.forEach((orders) => {
      if (orders.sort((a, b) => a - b).some((n, i) => n !== i + 1)) issues.push("images:non_contiguous_order")
    })
    return {
      target,
      issues,
      checksum: payloadHash_(old),
      counts: Object.fromEntries(Object.entries(old).map(([n, r]) => [n, r.length])),
    }
  },
  audit() {
    const p = this.plan()
    return { ok: !p.issues.length, issues: p.issues, checksum: p.checksum, counts: p.counts, driveVerified: false }
  },
  apply() {
    return withLock_(() => {
      const props = PropertiesService.getScriptProperties()
      if (props.getProperty("DB_SCHEMA_VERSION") === "2") throw new AppError("migration_complete", "v2は既に有効です。")
      const plan = this.plan()
      if (plan.issues.length)
        throw new AppError("migration_conflict", "旧データに不整合があります。監査結果を確認してください。")
      SheetStore.ensureTables()
      let record = SheetStore.readFresh("schema_migrations").find((r) => r.version === "2")
      if (record && record.checksum !== plan.checksum)
        throw new AppError("migration_conflict", "移行元が変更されました。書込停止とバックアップを確認してください。")
      if (!record)
        SheetStore.append("schema_migrations", [
          { version: "2", name: "legacy-to-v2", checksum: plan.checksum, state: "running", started_at: new Date() },
        ])
      let budget = 500
      for (const [name, rows] of Object.entries(plan.target)) {
        if (name === "schema_migrations") continue
        const current = SheetStore.readFresh(name),
          columns = TABLES[name].columns
        const canonical = (r) => columns.map((c) => (r[c] == null ? "" : r[c]))
        if (
          current.length > rows.length ||
          current.some((r, i) => JSON.stringify(canonical(r)) !== JSON.stringify(canonical(rows[i])))
        )
          throw new AppError("migration_conflict", "移行先の内容が一致しません。自動上書きしません。")
        const batch = rows.slice(current.length, current.length + budget)
        SheetStore.append(name, batch)
        budget -= batch.length
        SheetStore.update("schema_migrations", "2", { checkpoint: name + ":" + String(current.length + batch.length) })
        if (current.length + batch.length < rows.length) return { state: "running", resume: true }
      }
      SheetStore.update("schema_migrations", "2", { state: "verified", completed_at: new Date(), checkpoint: "all" })
      return { state: "verified", checksum: plan.checksum, activateRequired: true }
    })
  },
  activate() {
    return withLock_(() => {
      const plan = this.plan(),
        record = SheetStore.readFresh("schema_migrations").find((r) => r.version === "2")
      if (
        !record ||
        !["verified", "succeeded"].includes(record.state) ||
        record.checksum !== plan.checksum ||
        plan.issues.length
      )
        throw new AppError("migration_conflict", "再監査・移行が必要です。")
      const readyFiles = plan.target.assets.filter((r) => r.storage_kind === "drive" && r.state === "ready").length
      if (readyFiles && record.checkpoint !== "files:" + readyFiles)
        throw new AppError(
          "migration_conflict",
          "移行した画像の読取検証が必要です。verifyDatabaseV2Filesを実行してください。"
        )
      for (const [name, rows] of Object.entries(plan.target)) {
        if (name === "schema_migrations") continue
        const columns = TABLES[name].columns,
          normalize = (rs) => rs.map((r) => columns.map((c) => (r[c] == null ? "" : r[c])))
        if (JSON.stringify(normalize(SheetStore.readFresh(name))) !== JSON.stringify(normalize(rows)))
          throw new AppError("migration_conflict", "切替前の照合に失敗しました。")
      }
      SheetStore.update("schema_migrations", "2", { state: "succeeded" })
      PropertiesService.getScriptProperties().setProperty("DB_SCHEMA_VERSION", "2")
      TableCache.clear()
      return { activeVersion: 2 }
    })
  },
  verifyFiles() {
    return withLock_(() => {
      const plan = this.plan(),
        record = SheetStore.readFresh("schema_migrations").find((r) => r.version === "2")
      if (!record || record.state !== "verified" || record.checksum !== plan.checksum)
        throw new AppError("migration_conflict", "移行と照合を先に完了してください。")
      const assets = AssetRepository.list(true).filter((r) => r.storage_kind === "drive" && r.state === "ready")
      let index = record.checkpoint.startsWith("files:") ? Number(record.checkpoint.slice(6)) : 0
      const end = Math.min(index + 10, assets.length)
      for (; index < end; index++) {
        DriveStore.read(assets[index])
        SheetStore.update("schema_migrations", "2", { checkpoint: "files:" + (index + 1) })
      }
      return { verifiedFiles: index, totalFiles: assets.length, resume: index < assets.length }
    })
  },
}
