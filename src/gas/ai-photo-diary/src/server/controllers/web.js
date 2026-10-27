/**
 * ウェブアプリの入口。画面（client/index.html）を 1 度だけ配る。以後のやり取りは controllers/api.js。
 */
function doGet() {
  Seeder.ensureIfNeeded()
  const template = HtmlService.createTemplateFromFile("client/index")
  template.config = clientConfig_()
  return template.evaluate()
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover")
    .setTitle(Settings.app().name)
}

/** HTML から別の HTML ファイルを読み込む（<?!= include("client/...") ?>）。 */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent()
}

/**
 * 画面が起動時に受け取る設定（CONFIG）。
 * 最初の一覧（initialList）も入れて、開いてから一覧を取りに行く往復を 1 回なくす（docs/GAS性能_調査と対応方針.md 対応 A）。
 * 一覧の読み込みに失敗したら initialList は null にし、画面が今までどおり取りに行く。
 */
function clientConfig_() {
  const list = initialList_()
  return {
    app: Settings.app(),
    aiEnabled: Settings.providers().draft !== "mock",
    uploads: Settings.providers().photo === "drive" ? Settings.uploads() : null,
    photos: PhotoService.catalog(),
    tags: list ? list.tags : TagRepository.list(), // 一覧と一緒に読んだタグを使い回す
    sheetUrl: SheetStore.url(),
    limits: Object.assign({}, Settings.limits(), { images: PhotoService.maxPerPost() }),
    initialList: list,
  }
}

function initialList_() {
  const result = getAll(null)
  return result.ok ? result.data : null
}

/** script要素を閉じる文字列も、実行されないJSON文字列として埋め込む。 */
function serializeForScript_(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) =>
    "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0")
  )
}
