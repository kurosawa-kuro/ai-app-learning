/** GAS実機確認用。個人情報を含まない固定画像・作例だけを使う。 */
const IntegrationVerification = {
  photoDiary() {
    const started = Date.now()
    const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII="
    const input = (id) => ({ uploadId: id, mimeType: "image/png", base64 })
    const first = UploadService.upload(input("verification-photo-0001"))
    const replay = UploadService.upload(input("verification-photo-0001"))
    if (first.file_id !== replay.file_id || UploadService.read(first.file_id).base64 !== base64) throw new AppError("verification_failed", "画像の再送・読取が一致しません。")
    const one = DiaryService.create({ title: "検証：画像1枚", body: "個人情報を含まない固定作例です。", imageIds: [first.file_id] }, "verification-diary-one")
    const second = UploadService.upload(input("verification-photo-0002"))
    const order = [second.file_id, first.file_id]
    const many = DiaryService.create({ title: "検証：画像2枚", body: "並び順と再送を検証する固定作例です。", imageIds: order }, "verification-diary-two")
    TableCache.clear()
    const reloaded = DiaryService.get(many.id)
    if (JSON.stringify(reloaded.photos.map((p) => p.fileId)) !== JSON.stringify(order)) throw new AppError("verification_failed", "再取得した画像の順序が一致しません。")
    return { ok: true, singlePostId: one.id, multiplePostId: many.id, fileIds: order, retryVerified: true, readVerified: true, orderVerified: true, elapsedMs: Date.now() - started, note: "検証用の日記2件と画像2枚を残しました。ブラウザの選択・縮小・表示とスマホ性能は別途確認してください。" }
  },
}
