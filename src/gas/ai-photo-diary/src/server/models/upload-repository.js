/** 転送要求の永続記録。画像情報はAssetRepositoryが所有する。 */
const UploadRepository = {
  fresh: () => SheetStore.readFresh("upload_requests"),
  find(id) {
    return this.fresh().find((r) => r.upload_id === id)
  },
  insert: (row) => SheetStore.append("upload_requests", [row]),
  update: (id, values) => SheetStore.update("upload_requests", id, { ...values, updated_at: new Date() }),
}
