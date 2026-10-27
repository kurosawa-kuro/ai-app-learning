/**
 * スプレッドシートの自動実行（シンプルトリガー）。
 * 手でシートを直したら、置いてある表のキャッシュを捨てる（古い内容を画面に出さないため。server/db/table-cache.js）。
 */
function onEdit() {
  TableCache.clear()
}
