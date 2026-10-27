/** 画像の転送・再送・読取。外部操作は注入されたportsを通す。 */
function createUploadApplication_(ports) {
  return {
    upload(input) {
      if (!input || !/^[A-Za-z0-9_-]{8,80}$/.test(input.uploadId))
        throw new AppError("invalid", "アップロードIDが正しくありません。")
      const image = ports.images.decode(input)
      return ports.lock(() => {
        ports.database.ensure()
        let request = ports.uploads.find(input.uploadId)
        const hash = ports.hash({ version: 2, digest: image.digest, mime: image.mimeType })
        if (request && request.payload_hash !== hash)
          throw new AppError("upload_conflict", "同じアップロードIDで異なる画像は送れません。")
        if (!request) {
          const now = ports.clock.date(),
            assetId = "asset-" + ports.ids.next()
          request = {
            upload_id: input.uploadId,
            asset_id: assetId,
            payload_hash: hash,
            recovery_key: ports.storage.name({
              upload_id: input.uploadId,
              sha256: image.digest,
              mime_type: image.mimeType,
            }),
            state: "pending",
            created_at: now,
            updated_at: now,
          }
          ports.uploads.insert(request)
        }
        let asset = ports.assets.find(request.asset_id, true)
        if (!asset) {
          asset = {
            id: request.asset_id,
            storage_kind: "drive",
            storage_key: "",
            recovery_key: request.recovery_key,
            sha256: image.digest,
            mime_type: image.mimeType,
            byte_size: image.bytes.length,
            state: "pending",
            created_at: request.created_at,
            updated_at: ports.clock.date(),
          }
          ports.assets.insert(asset)
        }
        if (!AssetPolicy.canResumeUpload(asset.state))
          throw new AppError("invalid_image", "この画像は利用できません。選び直してください。")
        const fileId = asset.storage_key || ports.storage.createOrRecover(asset, image)
        if (asset.storage_key) ports.storage.read(asset)
        ports.assets.update(asset.id, { storage_key: fileId, state: "ready" })
        ports.uploads.update(input.uploadId, { state: "succeeded" })
        return {
          asset_id: asset.id,
          file_id: asset.id,
          kind: "drive",
          label: "アップロード画像",
          byte_size: image.bytes.length,
        }
      })
    },
    read(id) {
      const asset = ports.assets.resolve(String(id), true)
      if (!asset || asset.storage_kind !== "drive" || asset.state !== "ready")
        throw new AppError("not_found", "登録された画像が見つかりません。")
      return ports.storage.read(asset)
    },
  }
}
