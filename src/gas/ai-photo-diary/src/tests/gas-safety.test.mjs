import { test } from "node:test"
import assert from "node:assert/strict"
import { JSDOM, VirtualConsole } from "jsdom"
import { createGas, renderIndex } from "./gas-mock.mjs"

function ready() {
  const g = createGas()
  g.run("Seeder.ensureIfNeeded()")
  return g
}

test("保存先登録：既存DBを変更せず登録し、activeのないWeb実行で一覧を取得する", () => {
  const g = ready(), before = JSON.stringify([...g.sheets].map(([n, s]) => [n, s.rows]))
  g.props.delete("DIARY_SPREADSHEET_ID")
  g.run("SheetStore.ss_=null")
  g.run("bindDatabaseSpreadsheet()")
  assert.equal(g.props.get("DIARY_SPREADSHEET_ID"), "test-sheet")
  assert.equal(JSON.stringify([...g.sheets].map(([n, s]) => [n, s.rows])), before)
  g.run("SheetStore.ss_=null;SpreadsheetApp.getActiveSpreadsheet=()=>null")
  g.cache.clear()
  assert.equal(g.call("getAll").ok, true)
  assert.match(g.run("clientConfig_().sheetUrl"), /spreadsheets/)
})

test("保存先未設定・登録元なし・異なる登録先は誤った表へ接続せず停止する", () => {
  const g = createGas()
  g.props.delete("DIARY_SPREADSHEET_ID")
  assert.equal(g.call("getAll").error.code, "setup_required")
  assert.equal(g.sheets.size, 0)
  g.props.set("DIARY_SPREADSHEET_ID", "another-sheet")
  assert.throws(() => g.run("SetupService.bindDatabase()"), (e) => e.code === "setup_conflict")
  assert.equal(g.props.get("DIARY_SPREADSHEET_ID"), "another-sheet")
  g.run("SpreadsheetApp.getActiveSpreadsheet=()=>null")
  assert.throws(() => g.run("SetupService.bindDatabase()"), (e) => e.code === "setup_required")
  assert.equal(g.lock.held, false)
})

test("新規初期化は保存先IDを登録してからDBを作る", () => {
  const g = createGas()
  g.props.delete("DIARY_SPREADSHEET_ID")
  assert.equal(g.run("SetupService.initialize(false).initialized"), true)
  assert.equal(g.props.get("DIARY_SPREADSHEET_ID"), "test-sheet")
  assert.equal(g.props.get("DB_SCHEMA_VERSION"), "2")
})

test("起動HTML：保存済みのscript終端・HTML・改行を実行せず元の文字列へ復元する", () => {
  const g = ready()
  const title = '</script><script>window.__reviewMarker=1</script>'
  const body = '<!-- <ScRiPt> & > \u2028\u2029 $& ' + title
  assert.equal(g.call("create", { title, body }, "xss-regression").ok, true)
  const config = g.run("clientConfig_()")
  const dom = new JSDOM(renderIndex(config), {
    runScripts: "dangerously", virtualConsole: new VirtualConsole(), url: "https://local.invalid/",
  })
  try {
    assert.equal(dom.window.__reviewMarker, undefined)
    const posts = dom.window.eval("CONFIG.initialList.posts")
    assert.equal(posts.find((p) => p.title === title).body, body)
    assert.deepEqual(JSON.parse(dom.window.eval("JSON.stringify(CONFIG)")), JSON.parse(JSON.stringify(config)))
  } finally {
    dom.window.close()
  }
})

test("ロック：正常・業務例外・flush失敗でも確定を試みてから解除する", () => {
  for (const failure of ["none", "action", "flush"]) {
    const g = createGas(), events = []
    g.context.SpreadsheetApp.flush = () => {
      assert.equal(g.lock.held, true)
      events.push("flush")
      if (failure === "flush") throw Error("flush failed")
    }
    const run = () => g.run(`withLock_(()=>{${failure === "action" ? 'throw Error("action failed")' : 'return "done"'}})`)
    if (failure === "none") assert.equal(run(), "done")
    else assert.throws(run, new RegExp(failure + " failed"))
    assert.deepEqual(events, ["flush"])
    assert.equal(g.lock.held, false)
    assert.equal(g.lock.releases, 1)
  }
})

test("キャッシュ：flush前は新世代を公開せず、失敗時も古い値を新世代へ保存しない", () => {
  const g = ready()
  g.context.SpreadsheetApp.flush = () => {
    assert.equal(g.lock.held, true)
    assert.equal(g.run("TableCache.generation()"), null)
    throw Error("flush failed")
  }
  assert.throws(() => g.run('withLock_(()=>SheetStore.append("tags",[{id:"safe-tag",name:"test"}]))'), /flush failed/)
  assert.equal(g.run("TableCache.generation()"), null)
  assert.equal(g.lock.held, false)
})

test("AI予約の確定失敗後はプロバイダーを呼び出さない", () => {
  const g = ready()
  let calls = 0
  g.context.reviewProvider = () => { calls++; return { title: "T", body: "B", mock: true } }
  g.run("MockDraftProvider.generate=reviewProvider")
  g.context.SpreadsheetApp.flush = () => { throw Error("flush failed") }
  assert.equal(g.call("generateDraft", { requestId: "flush-ai-test", tagIds: ["10"] }).ok, false)
  assert.equal(calls, 0)
  assert.equal(g.lock.held, false)
})

test("文字列保存：先頭=・引用符・先頭ゼロを保存/再送し、数式を作らず日時型を維持する", () => {
  const g = ready()
  for (const [i, value] of ["=1+1", "'=1+1", "''引用符", "00123", '=IMPORTXML("https://invalid.example","x")'].entries()) {
    const request = { title: value, body: value }
    const first = g.call("create", request, "literal-" + i)
    assert.equal(first.ok, true)
    g.cache.clear()
    const again = g.call("create", request, "literal-" + i)
    assert.equal(again.ok, true)
    assert.equal(again.data.id, first.data.id)
    const row = g.run(`SheetStore.readFresh("posts").find(r=>r.id===${JSON.stringify(first.data.id)})`)
    assert.equal(row.title, value)
    assert.equal(row.body, value)
    assert.ok(row.created_at instanceof Date)
  }
  const formulas = g.sheets.get("v2_posts").getDataRange().getFormulas().flat()
  assert.ok(formulas.every((value) => value === ""))
})

test("AI結果更新：数式風の原文を保持し、所要時間と日時を数値・Dateで保存する", () => {
  const g = ready()
  g.context.reviewProvider = () => ({ title: "=1+1", body: "'=SUM(A1)", mock: true, elapsedMs: 42 })
  g.run("MockDraftProvider.generate=reviewProvider")
  const input = { requestId: "formula-ai", tagIds: ["10"] }
  const first = g.call("generateDraft", input)
  assert.equal(first.ok, true)
  assert.equal(first.data.title, "=1+1")
  g.cache.clear()
  assert.deepEqual(g.call("generateDraft", input), first)
  const row = g.run('SheetStore.readFresh("ai_generations")[0]')
  assert.equal(row.output_body, "'=SUM(A1)")
  assert.equal(row.elapsed_ms, 42)
  assert.ok(row.updated_at instanceof Date)
  assert.ok(g.sheets.get("v2_ai_generations").getDataRange().getFormulas().flat().every((v) => v === ""))
})

test("文字列補正の途中で失敗しても数式を残さず、同じ保存要求を再送できる", () => {
  const g = ready(), sheet = g.sheets.get("v2_posts"), original = sheet.getRange
  sheet.getRange = (...args) => {
    const range = original(...args)
    range.setRichTextValue = () => { throw Error("literal write failed") }
    return range
  }
  const input = { title: "=1+1", body: "'=1+1" }
  assert.equal(g.call("create", input, "literal-retry").ok, false)
  assert.ok(sheet.getDataRange().getFormulas().flat().every((v) => v === ""))
  sheet.getRange = original
  g.cache.clear()
  assert.equal(g.call("create", input, "literal-retry").ok, true)
  assert.equal(g.run('SheetStore.readFresh("posts").filter(r=>r.title==="=1+1").length'), 1)
})
