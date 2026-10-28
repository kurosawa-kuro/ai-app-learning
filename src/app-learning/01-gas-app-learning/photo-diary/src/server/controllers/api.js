/**
 * 画面（google.script.run）から呼ばれる公開関数。ここは受け取って渡すだけ：
 * 入力をサービスに渡し、結果を presenter で画面向けの形にし、respond_ で { ok, data } に包む。
 * 公開関数は GAS の大域に置く必要があるため、名前の末尾に _ を付けない（_ 付きは画面から呼べない）。
 */

/** Read-many：最大50件。cursorは直前ページ末尾のID。新規追記でページ位置をずらさない。 */
function getAll(tagId, cursor) {
  return respond_(() => {
    const result = DiaryService.list(tagId)
    const index = cursor == null ? -1 : result.diaries.findIndex((d) => d.id === cursor)
    if (cursor != null && (typeof cursor !== "string" || index < 0))
      throw new AppError("invalid_cursor", "一覧が変更されています。再読み込みしてください。")
    const start = index + 1, page = result.diaries.slice(start, start + 50)
    return {
      tag: result.tag, tags: result.tags, posts: DiaryPresenter.list(page),
      total: result.diaries.length,
      nextCursor: start + page.length < result.diaries.length ? page[page.length - 1].id : null,
    }
  })
}

/** Read-one：日記 1 件。 */
function getOne(id) {
  return respond_(() => DiaryPresenter.detail(DiaryService.get(id)))
}

/** Create：日記の作成。requestId は二重登録の防止に使う。 */
function create(data, requestId) {
  return respond_(() => DiaryPresenter.detail(DiaryService.create(data, requestId)))
}

/** AI 下書き。 */
function generateDraft(input) {
  return respond_(() => DraftService.generate(input))
}

function uploadPhoto(input) { return respond_(() => UploadService.upload(input)) }
function getPhoto(fileId) { return respond_(() => UploadService.read(fileId)) }
function listOrphanUploads() { return respond_(() => UploadMaintenance.candidates()) }
function trashOrphanUpload(uploadId) { return respond_(() => UploadMaintenance.trash(uploadId)) }

function cancelCreate(requestId) { return respond_(() => DiaryService.cancel(requestId)) }
function listGenerationHistoryForCleanup() { return respond_(() => GenerationMaintenance.candidates()) }
function purgeGenerationHistory(id) { return respond_(() => GenerationMaintenance.purge(id)) }

function getTags() { return respond_(() => ApplicationComposition.tags().list()) }
function changeTag(input) { return respond_(() => ApplicationComposition.tags().change(input)) }

function upgradeDiaryEntryDate() { return upgradeDiaryEntryDate_() }
