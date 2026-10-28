/** 日記の保存・再送・中止。外部操作は注入されたportsを通す。 */
function createDiaryApplication_(ports) {
  return {
    list(tagId) {
      ports.database.ensureIfNeeded()
      const { diaries, tags, tagsById } = ports.diaries.loadAll()
      if (tagId == null || tagId === "") return { tag: null, tags, diaries }
      const ids = [...new Set(String(tagId).split(","))].sort()
      if (ids.length > 20 || ids.some(id => !tagsById.has(id))) throw new AppError("not_found", "そのタグは見つかりません。")
      const tag = { id: ids.join(","), name: ids.map(id => tagsById.get(id).name).join("・") }
      return { tag, tags, diaries: diaries.filter(d => d.tags.some(t => ids.includes(t.id))) }
    },
    get(id) {
      ports.database.ensureIfNeeded()
      const d = ports.diaries.findById(id)
      if (!d) throw new AppError("not_found", "日記が見つかりません。")
      return d
    },
    normalize(data) {
      const source = data || {}
      return {
        version: 2,
        ...(source.entryDate == null ? {} : {entryDate:String(source.entryDate)}),
        title: String(source.title == null ? "" : source.title).trim(),
        body: String(source.body == null ? "" : source.body).replace(/\s+$/, ""),
        imageIds: uniqueStrings_(source.imageIds, "写真").map((id) => ports.photos.assetId(id)),
        tagIds: uniqueStrings_(source.tagIds, "キーワード").sort(),
        sourceGenerationId: source.sourceGenerationId == null ? "" : String(source.sourceGenerationId),
      }
    },
    create(data, requestId) {
      requireRequestId_(requestId)
      return ports.lock(() => {
        ports.database.ensure()
        const reserved = ports.requests.find(requestId)
        if (reserved && reserved.state === "cancelled")
          throw new AppError("request_cancelled", "中止済みの保存要求です。")
        if (reserved && !reserved.payload_hash) {
          const old = ports.diaries.findById(reserved.post_id, true)
          if (old) return old
          throw new AppError("recovery_required", "旧版の未完了要求は管理者による確認が必要です。")
        }
        const normalized = this.normalize(data),
          hash = ports.hash(normalized)
        if (reserved && reserved.payload_hash !== hash)
          throw new AppError("request_conflict", "送信済みの内容と異なります。保存状態を確認してから変更してください。")
        if (reserved) {
          const existing = ports.diaries.findById(reserved.post_id, true)
          if (existing) {
            if (reserved.state !== "succeeded") ports.requests.update(requestId, { state: "succeeded" })
            return existing
          }
        }
        const tagsById = new Map(ports.tags.fresh().map((t) => [t.id, t]))
        const input = ports.validation.forCreate(normalized, tagsById)
        ports.photos.validateAttachment(input.photoIds)
        if (normalized.sourceGenerationId) ports.generations.requireSucceeded(normalized.sourceGenerationId)
        const id = reserved ? reserved.post_id : ports.diaries.newId()
        if (!reserved) ports.requests.reserve(requestId, id, hash)
        else ports.diaries.clearIncompleteChildren(id)
        const createdAt = ports.clock.date(),
          sourceGenerationId = normalized.sourceGenerationId
        ports.diaries.insert({
          id,
          title: input.title,
          body: input.body,
          createdAt,
          entryDate: input.entryDate,
          photos: input.photoIds.map((fileId) => ({ fileId })),
          tagIds: input.tagIds,
          sourceGenerationId,
        })
        ports.requests.update(requestId, { state: "succeeded" })
        return {
          id,
          title: input.title,
          body: input.body,
          createdAt,
          entryDate: input.entryDate,
          sourceGenerationId,
          photos: input.photoIds.map((fileId, i) => ({ fileId, sortOrder: i + 1 })),
          tags: input.tagIds.map((id) => tagsById.get(id)),
        }
      })
    },
    cancel(requestId) {
      requireRequestId_(requestId)
      return ports.lock(() => {
        ports.database.ensure()
        const r = ports.requests.find(requestId)
        if (!r) {
          ports.requests.reserve(requestId, "", "")
          ports.requests.update(requestId, { state: "cancelled" })
          return { state: "cancelled" }
        }
        const post = ports.diaries.findById(r.post_id, true)
        if (post) return { state: "succeeded", postId: post.id }
        ports.requests.update(requestId, { state: "cancelled" })
        ports.diaries.clearIncompleteChildren(r.post_id)
        return { state: "cancelled" }
      })
    },
  }
}
