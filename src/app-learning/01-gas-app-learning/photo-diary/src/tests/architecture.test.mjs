// 役割の境界の検査。責任が 1 つのファイルに混ざり直したら落ちる（MVC・単一責任・疎結合を保つため）。
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { GAS_DIR } from "./gas-mock.mjs"

function files(dir, ext) {
  return readdirSync(join(GAS_DIR, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(`${dir}/${e.name}`, ext) : e.name.endsWith(ext) ? [`${dir}/${e.name}`] : [])
}
const sources = [...files("server", ".js"), ...files("client", ".html")]
  .filter((f) => !["server/config/generated.js", "server/config/generated-preferences.js"].includes(f))
  .map((f) => ({ file: f, text: readFileSync(join(GAS_DIR, f), "utf8").replace(/\/\/.*$|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/gm, "") })) // コメントは数えない

test("Domainは外部状態・Application・永続化・GASに依存しない", () => {
  const forbidden = /\b(?:ports|Settings|MasterData|ApplicationComposition|SheetStore|TableCache|Seeder|Utilities|SpreadsheetApp|DriveApp|UrlFetchApp|PropertiesService|CacheService|LockService)\b|\b\w+(?:Repository|Service|Provider|Presenter)\b|Date\.now\s*\(|new Date\s*\(\s*\)/
  for (const source of sources.filter(s => s.file.startsWith("server/domain/"))) {
    assert.equal(forbidden.test(source.text), false, source.file)
  }
})

test("Applicationの外部操作は注入ポートを通し、具体実装を参照しない", () => {
  const forbidden = /\b(?:Settings|MasterData|ApplicationComposition|SheetStore|TableCache|Seeder|Utilities|SpreadsheetApp|DriveApp|UrlFetchApp|PropertiesService|CacheService|LockService|DriveStore|withLock_|payloadHash_|isoDateTime_)\b|\b\w+(?:Repository|Service|Provider|Presenter)\b|Date\.now\s*\(|new Date\s*\(\s*\)/
  for (const source of sources.filter(s => s.file.startsWith("server/application/"))) {
    assert.equal(forbidden.test(source.text), false, source.file)
  }
})

/** pattern が現れてよいのは allowed のファイルだけ。 */
function onlyIn(pattern, allowed, why) {
  const found = sources.filter((s) => pattern.test(s.text)).map((s) => s.file)
  assert.deepEqual(found.filter((f) => !allowed.includes(f)), [], `${why}（使ってよいのは ${allowed.join("、")}）`)
}

test("シートに触るのは db/sheet-store.js だけ", () => {
  onlyIn(/SpreadsheetApp/, ["server/db/sheet-store.js"], "シートの読み書きは SheetStore に閉じる")
})

test("設定とマスターを読むのは config/settings.js だけ", () => {
  onlyIn(/DIARY_PREFERENCES/, ["server/config/settings.js"], "文体設定を読むのはSettingsだけ")
  onlyIn(/APP_CONFIG|APP_DATA/, ["server/config/settings.js"], "data/ の値は Settings / MasterData を通す")
})

test("写真・AI 下書きの中身を知っているのは、それぞれの提供元だけ", () => {
  onlyIn(/MasterData\.photos/, ["server/services/photo/dummy-photo-provider.js"], "ダミー写真の目録は提供元の中だけ")
  onlyIn(/MasterData\.draft/, ["server/services/draft/mock-draft-provider.js"], "固定の下書き文は提供元の中だけ")
  onlyIn(/DummyPhotoProvider/, ["server/services/photo/dummy-photo-provider.js", "server/services/photo/photo-service.js", "server/services/photo/drive-photo-provider.js"], "提供元を選ぶのは PhotoService だけ")
  onlyIn(/MockDraftProvider/, ["server/services/draft/mock-draft-provider.js", "server/services/draft/draft-service.js"], "提供元を選ぶのは DraftService だけ")
})

test("GAS のサービスはそれぞれ 1 か所から", () => {
  onlyIn(/UrlFetchApp/, ["server/services/draft/openai-client.js"], "OpenAI通信はOpenAIClientに閉じる")
  onlyIn(/HtmlService/, ["server/controllers/web.js"], "画面の配信は controllers/web.js")
  onlyIn(/LockService/, ["server/core/lock.js"], "ロックは withLock_")
  onlyIn(/CacheService/, ["server/services/diary-service.js", "server/db/table-cache.js"], "二重登録の防止は DiaryService.create、表のキャッシュは TableCache")
})

test("画面から呼べる公開関数は controllers/ にだけ置く", () => {
  const publicFn = /^function\s+(?!.*_\s*\()([A-Za-z]\w*)\s*\(/m
  onlyIn(publicFn, ["server/controllers/api.js", "server/controllers/web.js", "server/controllers/perf.js", "server/controllers/triggers.js", "server/controllers/setup.js"], "名前が _ で終わらない関数は画面から呼べてしまう")
})

test("画面側：サーバーとの通信は api.html、履歴は router.html だけ", () => {
  onlyIn(/google\.script\.run/, ["client/core/api.html"], "通信は App.api に閉じる")
  onlyIn(/google\.script\.(history|url)/, ["client/core/router.html"], "履歴は App.router に閉じる")
  onlyIn(/data:image\/svg/, ["client/core/photo-view.html"], "写真の描き方は App.photoView に閉じる")
})

test("色の値を書いてよいのは admin-theme.html だけ（ダミー写真の絵を描く photo-view.html を除く）", () => {
  onlyIn(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/, ["client/vendor/admin-pico/admin-theme.html", "client/core/photo-view.html"], "色は --admin-* の変数で使う。値はテーマの 1 か所で変える")
})
