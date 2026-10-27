/** Drive操作を集約。アプリ専用・所有者のみの保存先から外へ出ない。 */
const DriveStore = {
  private_(item, allowTrashed = false) {
    const account = Session.getEffectiveUser().getEmail()
    const owner = item.getOwner()
    return (allowTrashed || !item.isTrashed()) && account && owner && owner.getEmail() === account && item.getSharingAccess() === DriveApp.Access.PRIVATE && item.getEditors().length === 0 && item.getViewers().length === 0
  },
  folder() {
    const id = IntegrationSettings.photoFolderId()
    if (!id) throw new AppError("setup_required", "画像の保存先を設定してください。")
    const folder = DriveApp.getFolderById(id)
    if (!this.private_(folder)) throw new AppError("private_required", "保存先を所有者のみの非公開フォルダにしてください。")
    return folder
  },
  file(id, allowTrashed = false) {
    const folder = this.folder(), file = DriveApp.getFileById(id), parents = file.getParents()
    let contained = false
    while (parents.hasNext()) if (parents.next().getId() === folder.getId()) contained = true
    if (!contained || !this.private_(file, allowTrashed)) throw new AppError("invalid_image", "この画像は取得できません。保存先と共有状態を確認してください。")
    return file
  },
  name(row) { if (row.recovery_key) return row.recovery_key; return `apd_${row.upload_id}_${row.sha256}.${row.mime_type === "image/png" ? "png" : "jpg"}` },
  createOrRecover(row, image) {
    const folder = this.folder(), name = this.name(row), found = folder.getFilesByName(name)
    let file = found.hasNext() ? found.next() : null
    if (found.hasNext()) throw new AppError("upload_conflict", "同名画像が複数あります。保存先を確認してください。")
    if (!file) file = folder.createFile(Utilities.newBlob(image.bytes, image.mimeType, name))
    if (!this.private_(file)) throw new AppError("private_required", "画像が非公開になっていません。共有設定を確認してください。")
    const actual = file.getBlob().getBytes()
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, actual).map((v) => (v & 255).toString(16).padStart(2, "0")).join("")
    if (digest !== row.sha256) throw new AppError("upload_conflict", "保存画像の内容が一致しません。")
    return file.getId()
  },
  read(row) {
    const file = this.file((row.storage_key || row.file_id))
    if (file.getSize() > Settings.uploads().maxBytes || file.getName() !== this.name(row)) throw new AppError("invalid_image", "画像の保存内容が変更されています。")
    const bytes = file.getBlob().getBytes(), base64 = Utilities.base64Encode(bytes)
    const image = ImageValidator.decode({ mimeType: row.mime_type, base64 })
    if (image.digest !== row.sha256) throw new AppError("invalid_image", "画像の内容が変更されています。")
    return { mimeType: row.mime_type, base64, bytes: bytes.length }
  },
  trash(row) { this.file((row.storage_key || row.file_id), true).setTrashed(true) },
}
