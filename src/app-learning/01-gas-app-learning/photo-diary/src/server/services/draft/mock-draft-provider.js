/**
 * AI 下書きの提供元（モック）。OpenAI はまだ呼ばず、data/sample-data.yaml の draft の固定の文章を返す。設計書 3 章 P02。
 *
 * AI 下書きの提供元が満たす形（OpenAI 版を足すときも同じ形にする）：
 *   generate({ photos, tags }) -> { title, body, mock }
 *     photos：選んだ写真の表示用の情報（PhotoService.view の形）。並びは選んだ順
 *     tags：選んだキーワード [{ id, name }]
 */
const MockDraftProvider = {
  generate(_input) {
    const draft = MasterData.draft()
    return { title: draft.title, body: draft.body, mock: true }
  },
}
