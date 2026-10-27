/** 画像資産の利用・整理条件。参照状況と時刻は外から渡す。 */
const AssetPolicy = {
  isReady(state) {
    return state === "ready"
  },
  canResumeUpload(state) {
    return !["trashed", "trash_pending", "missing"].includes(state)
  },
  canTrash({ storageKind, state, referenced, createdAt }, now, retentionHours) {
    return (
      storageKind === "drive" &&
      ["ready", "trash_pending"].includes(state) &&
      !referenced &&
      createdAt instanceof Date &&
      createdAt.getTime() < now - retentionHours * 3600000
    )
  },
  validateTotalBytes(bytes, maximum) {
    if (bytes > maximum) throw new AppError("invalid_image", "画像の合計容量が上限を超えています。")
  },
}
