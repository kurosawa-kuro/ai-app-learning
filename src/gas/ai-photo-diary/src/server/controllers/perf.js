/**
 * 計測用の公開関数。画面の #perf から呼ぶ（docs/GAS性能_調査と対応方針.md 6 章）。
 * 往復の時間（画面で計る）と、サーバーの中の処理の時間（serverMs）を分けて見るためのもの。計測が済んだら、このファイルと client/views/perf.html を消す。
 */

/** 1. 何もしない。往復の時間は、ほぼ GAS の起動と通信の分。 */
function perfPing() {
  const started = Date.now()
  return respond_(() => ({ serverMs: Date.now() - started }))
}

/** 2. Sheets から 1 表（tags）だけ読む。キャッシュを通さず、Sheets そのものの速さを計る。 */
function perfReadOne() {
  const started = Date.now()
  return respond_(() => {
    const rows = SheetStore.readFresh("tags")
    return { serverMs: Date.now() - started, rows: rows.length }
  })
}

/** 4. キャッシュを捨ててから一覧を作る（キャッシュの無かった前の版と同じ速さ）。終わると次からはまたキャッシュが効く。 */
function perfListNoCache() {
  const started = Date.now()
  return respond_(() => {
    TableCache.clear()
    const result = DiaryService.list(null)
    DiaryPresenter.list(result.diaries)
    return { serverMs: Date.now() - started, rows: result.diaries.length }
  })
}

/** 3. 今の一覧と同じ処理（キャッシュあり。4 表を読んで結合し、画面向けの形にする）。 */
function perfList() {
  const started = Date.now()
  return respond_(() => {
    const result = DiaryService.list(null)
    DiaryPresenter.list(result.diaries)
    return { serverMs: Date.now() - started, rows: result.diaries.length }
  })
}
