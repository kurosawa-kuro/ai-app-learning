// gas/server.js のテスト（模擬 GAS 上で、公開関数 getAll / getOne / create / generateDraft と表の準備を確かめる）
import { test } from "node:test"
import assert from "node:assert/strict"
import { createGas } from "./gas-mock.mjs"

function ready(options) {
  const gas = createGas(options)
  gas.run("withLock_(() => Seeder.ensure())")
  return gas
}
const ok = (res) => {
  assert.equal(res.ok, true, JSON.stringify(res.error))
  return res.data
}
const ng = (res, code) => {
  assert.equal(res.ok, false)
  assert.equal(res.error.code, code)
  return res.error.message
}

test("初回：v2の10表を作り、タグとサンプル日記を入れる", () => {
  const gas = ready()
  assert.deepEqual([...gas.sheets.keys()].sort(), Object.keys(gas.run("TABLES")).map((n) => "v2_"+n).sort())
  assert.deepEqual(gas.sheets.get("v2_posts").rows[0], ["id", "title", "body", "created_at", "source_generation_id", "entry_date"])
  assert.equal(gas.sheets.get("v2_posts").frozen, 1)
  const data = ok(gas.call("getAll"))
  assert.deepEqual(data.posts.map((p) => p.title), ["休日のお出かけ", "カフェに行った"]) // 新しい順
  assert.equal(data.tags.length, 8)
  assert.equal(data.tag, null)
})

test("2 回目以降は初期データを足さない", () => {
  const gas = ready()
  gas.run("withLock_(() => Seeder.ensure())")
  assert.equal(ok(gas.call("getAll")).posts.length, 2)
  assert.equal(ok(gas.call("getAll")).tags.length, 8)
})

test("新規初期化でも既存のbooksシートを削除しない", () => {
  const gas = ready({ existingSheets: ["books"] })
  assert.equal(gas.sheets.has("books"), true)
})

test("ID は文字列のまま保存される（\"10\" が数値に化けない）", () => {
  const gas = ready()
  assert.equal(gas.sheets.get("v2_tags").rows[1][0], "10")
  assert.equal(gas.sheets.get("v2_post_tags").rows[1][1], "10")
})

test("Read-many：代表画像・写真の枚数・タグ・本文の冒頭を付ける", () => {
  const gas = ready()
  const cafe = ok(gas.call("getAll")).posts.find((p) => p.id === "1")
  assert.deepEqual(cafe.image, { file_id: "sample-a", asset_id: "sample-a", label: "カフェ", kind: "dummy", hue: 28, sort_order: 1 }) // 写真の提供元（ダミー）の表示用の情報
  assert.equal(cafe.imageCount, 2)
  assert.deepEqual(cafe.tags.map((t) => t.name), ["カフェ", "休日", "スイーツ"])
  assert.equal(cafe.excerpt, "今日はカフェでケーキを食べた。 窓ぎわの席が空いていて、ゆっくりできた。")
  assert.match(cafe.created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/)
  // 対応 B：詳細を往復なしで出せるよう、本文と全写真も含める
  assert.equal(cafe.body, "今日はカフェでケーキを食べた。\n窓ぎわの席が空いていて、ゆっくりできた。")
  assert.deepEqual(cafe.images.map((i) => i.file_id), ["sample-a", "sample-b"])
})

test("タグで絞り込める（post_tags で結合）", () => {
  const gas = ready()
  const holiday = ok(gas.call("getAll", "11"))
  assert.deepEqual(holiday.tag, { id: "11", name: "休日" })
  assert.equal(holiday.posts.length, 2)
  assert.deepEqual(ok(gas.call("getAll", "12")).posts.map((p) => p.id), ["1"])
  assert.equal(ok(gas.call("getAll", "15")).posts.length, 0)
  ng(gas.call("getAll", "999"), "not_found")
})

test("Read-one：全画像を表示順に、全タグを付ける。無い ID は日記が見つかりません", () => {
  const gas = ready()
  const post = ok(gas.call("getOne", "1"))
  assert.deepEqual(post.images.map((i) => i.file_id), ["sample-a", "sample-b"])
  assert.equal(post.body, "今日はカフェでケーキを食べた。\n窓ぎわの席が空いていて、ゆっくりできた。")
  assert.equal(post.tags.length, 3)
  assert.equal(ng(gas.call("getOne", "nope"), "not_found"), "日記が見つかりません。")
})

test("Create：3 表へ登録し、選んだ順が画像の表示順になる", () => {
  const gas = ready()
  const post = ok(gas.call("create", { title: " 海へ ", body: "波を見た。", imageIds: ["sample-d", "sample-a"], tagIds: ["13", "11"] }, "rq-1"))
  assert.equal(post.title, "海へ")
  assert.deepEqual(post.images.map((i) => [i.file_id, i.sort_order]), [["sample-d", 1], ["sample-a", 2]])
  assert.deepEqual(post.tags.map((t) => t.id), ["11", "13"])
  assert.equal(ok(gas.call("getAll")).posts[0].id, post.id) // 一番新しい
  assert.deepEqual(ok(gas.call("getAll", "13")).posts.map((p) => p.id), [post.id]) // 既存タグの再利用
})

test("Create：同じ requestId の再送は 1 件しか作らない", () => {
  const gas = ready()
  const a = ok(gas.call("create", { title: "t", body: "b" }, "rq-same"))
  const b = ok(gas.call("create", { title: "t", body: "b" }, "rq-same"))
  assert.equal(a.id, b.id)
  assert.equal(ok(gas.call("getAll")).posts.length, 3)
})

test("Create：重複したタグ・写真は 1 つにまとめる（post_tags の二重登録を防ぐ）", () => {
  const gas = ready()
  const post = ok(gas.call("create", { title: "t", body: "b", imageIds: ["sample-a", "sample-a"], tagIds: ["10", "10", "11"] }, "rq-dup"))
  assert.equal(post.images.length, 1)
  assert.deepEqual(post.tags.map((t) => t.id), ["10", "11"])
  const rows = gas.sheets.get("v2_post_tags").rows.filter((r) => r[0] === post.id)
  assert.equal(rows.length, 2)
})

test("Create：検証に落ちたら 1 行も書かない", () => {
  const gas = ready()
  const before = [...gas.sheets.values()].map((s) => s.getLastRow())
  assert.match(ng(gas.call("create", { title: "", body: "b" }, "invalid-request"), "invalid"), /タイトル/)
  assert.match(ng(gas.call("create", { title: "t", body: "  " }, "invalid-request"), "invalid"), /本文/)
  assert.match(ng(gas.call("create", { title: "t", body: "b", imageIds: ["evil"] }, "invalid-request"), "invalid"), /写真/)
  assert.match(ng(gas.call("create", { title: "t", body: "b", tagIds: ["999"] }, "invalid-request"), "invalid"), /キーワード/)
  assert.match(ng(gas.call("create", { title: "t", body: "b", tagIds: "10" }, "invalid-request"), "invalid"), /キーワード/)
  assert.match(ng(gas.call("create", { title: "x".repeat(121), body: "b" }, "invalid-request"), "invalid"), /120文字/)
  assert.deepEqual([...gas.sheets.values()].map((s) => s.getLastRow()), before)
})

test("AI 下書き（モック）：写真かキーワードが要り、固定の文章を返す", () => {
  const gas = ready()
  const draft = ok(gas.call("generateDraft", { requestId: "test-gen-1", imageIds: ["sample-a"], tagIds: [] }))
  assert.equal(draft.title, "ゆったり過ごした一日")
  assert.equal(draft.mock, true)
  ng(gas.call("generateDraft", { requestId: "test-gen-2", imageIds: [], tagIds: [] }), "invalid")
  ng(gas.call("generateDraft", { requestId: "test-gen-3", imageIds: ["evil"] }), "invalid")
})

test("親の無い子（書き込み途中の失敗の残り）は一覧にも詳細にも出ない", () => {
  const gas = ready()
  gas.run(`SheetStore.append("post_assets", [{ id: "x1", post_id: "ghost", asset_id: "sample-a", sort_order: 1 }])`)
  gas.run(`SheetStore.append("post_tags", [{ post_id: "ghost", tag_id: "10" }])`)
  assert.equal(ok(gas.call("getAll")).posts.some((p) => p.id === "ghost"), false)
  assert.equal(ok(gas.call("getAll", "10")).posts.length, 1)
  ng(gas.call("getOne", "ghost"), "not_found")
})

test("写真の提供元は差し替えられる（日記側は変えずに、url を持つ写真がそのまま画面へ渡る）", () => {
  const gas = ready()
  gas.run(`PhotoService.providers_ = () => ({ dummy: {
    catalog: () => [],
    exists: (id) => id === "drive-1",
    view: (id) => ({ file_id: id, label: "旅", kind: "url", url: "https://example.test/" + id }),
    maxPerPost: () => 3,
  } })`)
  gas.run('AssetRepository.insert({id:"drive-1",storage_kind:"dummy",storage_key:"drive-1",state:"ready"})')
  const post = ok(gas.call("create", { title: "t", body: "b", imageIds: ["drive-1"] }, "rq-photo"))
  assert.equal(post.images[0].url, "https://example.test/drive-1")
  ng(gas.call("create", { title: "t", body: "b", imageIds: ["unregistered"] }, "invalid-request"), "invalid") // 提供元に無い写真は拒否
})

test("AI 下書きの提供元は差し替えられる（選んだ写真とキーワードが解決済みで渡る）", () => {
  const gas = ready()
  gas.run(`DraftService.providers_ = () => ({ mock: {
    generate: ({ photos, tags }) => ({ title: tags.map((t) => t.name).join("・"), body: photos.map((p) => p.label).join("と"), mock: false }),
  } })`)
  const draft = ok(gas.call("generateDraft", { requestId: "test-gen-4", imageIds: ["sample-d", "sample-a"], tagIds: ["13"] }))
  assert.ok(draft.generationId)
  delete draft.generationId
  assert.deepEqual(draft, { title: "旅行", body: "海とカフェ", mock: false })
})

test("新規提供元設定が不正でも保存済み資産は保存時の種類で表示する", () => {
  const gas = ready()
  gas.run(`APP_CONFIG.providers.photo = "unknown-provider"`)
  assert.equal(gas.call("getOne", "1").ok, true)
  assert.throws(() => gas.run("PhotoService.catalog()"))
})

test("対応 A：最初の画面の設定に一覧が入り、タグは 1 回だけ読む", () => {
  const gas = ready()
  const config = gas.call("clientConfig_")
  assert.deepEqual(config.initialList.posts.map((p) => p.title), ["休日のお出かけ", "カフェに行った"])
  assert.deepEqual(config.tags, config.initialList.tags)
})

test("対応 C：シートが揃っていれば、画面を開くときにロックを取らない", () => {
  const gas = ready()
  let locks = 0
  const real = gas.context.LockService.getScriptLock
  gas.context.LockService.getScriptLock = () => { locks++; return real() }
  gas.run("Seeder.ensureIfNeeded()")
  assert.equal(locks, 0)
  // シートを手で消しても、「揃っている」の印（キャッシュ）がある間は気づかない（取り決め。CLAUDE.md の前提）
  gas.sheets.delete("v2_tags")
  gas.run("Seeder.ensureIfNeeded()")
  assert.equal(locks, 0)
  // 印が消えたら欠損を検出する。既存環境は自動再作成しない。
  gas.run("onEdit()")
  assert.throws(() => gas.run("Seeder.ensureIfNeeded()"))
  assert.equal(gas.sheets.has("v2_tags"), false)
})

test("保存前は印に頼らず表を確かめ、欠損していたら書込を拒否する", () => {
  const gas = ready()
  gas.sheets.delete("v2_post_tags")
  ng(gas.call("create", { title: "t", body: "b", tagIds: ["10"] }, "rq-strict"), "schema_missing")
  assert.equal(gas.sheets.has("v2_post_tags"), false)
})

test("計測用の関数は、サーバーの中の時間を返す", () => {
  const gas = ready()
  for (const fn of ["perfPing", "perfReadOne", "perfList", "perfListNoCache"]) {
    const data = ok(gas.call(fn))
    assert.equal(typeof data.serverMs, "number")
  }
  assert.equal(ok(gas.call("perfList")).rows, 2)
})

/** 表のシートを Sheets から読んだ回数を数える（getDataRange はシートの読み込みにだけ使う）。 */
function countSheetReads(gas) {
  const counts = {}
  for (const [name, sheet] of gas.sheets) {
    const real = sheet.getDataRange
    sheet.getDataRange = (...a) => { counts[name] = (counts[name] || 0) + 1; return real(...a) }
  }
  return counts
}

test("対応 E：2 回目からの一覧はキャッシュから出て、Sheets を読まない", () => {
  const gas = ready()
  ok(gas.call("getAll")) // 1 回目で 4 表をキャッシュに置く
  assert.ok(["posts", "post_assets", "tags", "post_tags"].every((n) => gas.cache.has(gas.run(`TableCache.key("${n}",TableCache.generation())`))))
  const reads = countSheetReads(gas)
  const data = ok(gas.call("getAll"))
  assert.deepEqual(reads, {})
  assert.match(data.posts[0].created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/) // キャッシュから戻した日時も Date として扱える
  ok(gas.call("getOne", "1"))
  assert.deepEqual(reads, {})
})

test("対応 E：保存した行はキャッシュにも書き足し、保存のあとの一覧も Sheets を読まない", () => {
  const gas = ready()
  ok(gas.call("getAll"))
  const reads = countSheetReads(gas)
  const post = ok(gas.call("create", { title: "新しい日記", body: "本文", imageIds: ["sample-c"], tagIds: ["12"] }, "rq-cache"))
  assert.equal(post.title, "新しい日記")
  assert.deepEqual(post.images.map((i) => i.file_id), ["sample-c"])
  const beforeList = {...reads}
  const list = ok(gas.call("getAll", "12"))
  assert.deepEqual(list.posts.map((p) => p.id).sort(), ["1", post.id].sort())
  assert.deepEqual(reads, beforeList)
})

test("対応 E：スプレッドシートを手で直したら（onEdit）キャッシュを捨て、次は Sheets から読む", () => {
  const gas = ready()
  ok(gas.call("getAll"))
  gas.run("onEdit()")
  assert.equal(Object.keys(gas.run("TableCache.getMany(Object.keys(TABLES))")).length, 0)
  const reads = countSheetReads(gas)
  ok(gas.call("getAll"))
  assert.equal(reads.v2_posts, 1)
})

test("対応 E：大きすぎる表はキャッシュに置かず、キャッシュが壊れても一覧は出る", () => {
  const gas = ready()
  // 日本語の長い本文で posts を 90KB 超にする（文字数では 100K 未満でもバイトでは超える）
  for (let i = 0; i < 7; i++) ok(gas.call("create", { title: `長い日記${i}`, body: "あ".repeat(5000) }, `rq-big-${i}`)) // 1 件 約 15KB × 7
  gas.run("TableCache.clear()")
  ok(gas.call("getAll"))
  assert.equal(gas.cache.has(gas.run('TableCache.key("posts",TableCache.generation())')), false, "大きすぎる posts を置いている")
  assert.equal(gas.cache.has(gas.run('TableCache.key("tags",TableCache.generation())')), true)
  // キャッシュの読み書きが失敗しても、Sheets から読んで一覧を返す
  gas.context.CacheService.getScriptCache = () => ({ getAll() { throw new Error("down") }, putAll() { throw new Error("down") }, get: () => null, put() {}, removeAll() {} })
  assert.equal(ok(gas.call("getAll")).posts.length, 9)
})
