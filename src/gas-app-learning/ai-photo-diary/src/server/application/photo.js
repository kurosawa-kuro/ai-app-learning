/** 画像資産の参照・利用確認。外部操作は注入されたportsを通す。 */
function createPhotoApplication_(ports) {
  return {
    providers_: () => ports.providers(),
    provider_() {
      const p = this.providers_()[ports.settings.providers().photo]
      if (!p) throw new Error("写真提供元の設定がありません")
      return p
    },
    seedAssets(now) {
      this.providers_()
        .dummy.catalog()
        .forEach((p) => {
          if (!ports.assets.find(p.file_id, true))
            ports.assets.insert({
              id: p.file_id,
              storage_kind: "dummy",
              storage_key: p.file_id,
              state: "ready",
              created_at: now,
              updated_at: now,
            })
        })
    },
    catalog() {
      return this.provider_().catalog()
    },
    exists(id) {
      const a = ports.assets.resolve(id, true)
      return Boolean(a && AssetPolicy.isReady(a.state))
    },
    assetId(id) {
      const a = ports.assets.resolve(id, true)
      if (!a) throw new AppError("invalid", "写真が見つかりません。")
      return a.id
    },
    view(id) {
      const a = ports.assets.resolve(id)
      return this.viewAsset_(id, a)
    },
    // 一覧・詳細の表示ごとに作る。共有キャッシュ停止・容量超過でも表を一度だけ読む。
    viewResolver() {
      let byId, byKey
      const views = new Map()
      return (id) => {
        if (!byId) {
          const rows = ports.assets.list()
          byId = new Map(rows.map((a) => [a.id, a]))
          byKey = new Map()
          rows.forEach((a) => {
            if (!byKey.has(a.storage_key)) byKey.set(a.storage_key, a)
          })
        }
        if (!views.has(id)) views.set(id, this.viewAsset_(id, byId.get(id) || byKey.get(id)))
        return views.get(id)
      }
    },
    viewAsset_(id, a) {
      if (!a || !AssetPolicy.isReady(a.state))
        return { file_id: id, asset_id: id, kind: "missing", label: "画像を取得できません" }
      const p = this.providers_()[a.storage_kind]
      if (!p) return { file_id: a.id, asset_id: a.id, kind: "missing", label: "画像を取得できません" }
      return { ...p.view(a.storage_key, a), file_id: a.id, asset_id: a.id }
    },
    maxPerPost() {
      return this.provider_().maxPerPost()
    },
    validateAttachment(ids) {
      let bytes = 0
      ids.forEach((id) => {
        const a = ports.assets.resolve(id, true)
        if (!a || !AssetPolicy.isReady(a.state)) throw new AppError("invalid_image", "利用できない画像があります。")
        if (a.storage_kind === "drive") {
          ports.storage.file(a.storage_key)
          bytes += Number(a.byte_size)
        }
      })
      AssetPolicy.validateTotalBytes(bytes, ports.settings.uploads().maxTotalBytes)
    },
    readForAi(ids) {
      if (ids.length > ports.settings.uploads().maxImages)
        throw new AppError("invalid_image", "写真の枚数が上限を超えています。")
      let total = 0
      return ids.map((id) => {
        const image = ports.upload.read(id)
        total += image.bytes
        AssetPolicy.validateTotalBytes(total, ports.settings.uploads().maxTotalBytes)
        return image
      })
    },
  }
}
