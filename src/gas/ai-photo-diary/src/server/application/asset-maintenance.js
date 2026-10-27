/** 画像資産の手動整理。外部操作は注入されたportsを通す。 */
function createAssetMaintenanceApplication_(ports) {
  return {
    pending() {
      return ports.uploads
        .fresh()
        .filter((r) => r.state === "pending")
        .map((r) => ({
          uploadId: r.upload_id,
          assetId: r.asset_id,
          expectedName: r.recovery_key,
          createdAt: ports.formatDate(r.created_at),
        }))
    },
    candidates() {
      const refs = ports.assets.referenced(),
        now = ports.clock.now()
      return ports.assets
        .list(true)
        .filter((r) =>
          AssetPolicy.canTrash(
            {
              storageKind: r.storage_kind,
              state: r.state,
              referenced: refs.has(r.id),
              createdAt: r.created_at,
            },
            now,
            ports.settings.uploads().retentionHours
          )
        )
        .map((r) => ({
          uploadId: r.id,
          assetId: r.id,
          fileId: r.storage_key,
          bytes: Number(r.byte_size),
          createdAt: ports.formatDate(r.created_at),
        }))
    },
    trash(id) {
      return ports.lock(() => {
        const request = ports.uploads.find(id),
          assetId = request ? request.asset_id : id
        const asset = ports.assets.find(assetId, true)
        if (asset && asset.state === "trashed") return { trashed: true }
        if (!this.candidates().some((r) => r.assetId === assetId))
          throw new AppError("in_use", "参照中・保存直後の画像は削除できません。")
        ports.assets.update(assetId, { state: "trash_pending" })
        ports.storage.trash(asset)
        ports.assets.update(assetId, { state: "trashed" })
        return { trashed: true }
      })
    },
  }
}
