import { test } from "node:test"
import assert from "node:assert/strict"
import { JSDOM } from "jsdom"
import { renderIndex } from "./gas-mock.mjs"
import { driveGas } from "./drive-mock.mjs"

const wait = (ms = 80) => new Promise((r) => setTimeout(r, ms))
// Canvasと画像デコーダーはjsdomにないため境界を模擬。ブラウザの実符号化は実機確認対象。
const jpeg = Buffer.from([255,216,255,192,0,17,8,0,1,0,1,3,1,17,0,2,17,0,3,17,0,255,218,0,12,3,1,0,2,17,3,17,0,63,0,0,255,217]).toString("base64")
async function boot() {
  const gas = driveGas()
  gas.run('APP_CONFIG.providers.photo="drive"; APP_CONFIG.providers.draft="openai"; OpenAIClient.generateText=()=>({ok:true,text:JSON.stringify({title:"下書き",body:"本文の作例"})})')
  const ctl = { uploads: 0, failSecond: true, calls: [] }
  const dom = new JSDOM(renderIndex(gas.run("clientConfig_()")), { runScripts: "dangerously", pretendToBeVisual: true, beforeParse(w) {
    w.scrollTo = () => {}; w.confirm = () => true; w.alert = () => {}
    w.URL.createObjectURL = () => "blob:test"; w.URL.revokeObjectURL = () => {}
    w.Image = class { naturalWidth = 1; naturalHeight = 1; decode() { return Promise.resolve() } set src(_) { setTimeout(() => { if (this.onload) this.onload() }, 0) } }
    w.HTMLCanvasElement.prototype.getContext = () => ({ fillRect() {}, drawImage() {} })
    w.HTMLCanvasElement.prototype.toDataURL = () => `data:image/jpeg;base64,${jpeg}`
    const runner = (ok, fail) => new Proxy({}, { get(_, name) {
      if (name === "withSuccessHandler") return (cb) => runner(cb, fail)
      if (name === "withFailureHandler") return (cb) => runner(ok, cb)
      return (...args) => setTimeout(() => {
        ctl.calls.push(name)
        if (name === "uploadPhoto") { ctl.uploads++; if (ctl.uploads === 2 && ctl.failSecond) { fail(Error("network")); return } }
        ok(gas.call(name, ...args))
      }, 5)
    } })
    w.google = { script: { get run() { return runner() }, history: { setChangeHandler() {}, push() {}, replace() {} }, url: { getLocation: (cb) => setTimeout(() => cb({ hash: "new" }), 0) } } }
  } })
  const $ = (id) => dom.window.document.getElementById(id)
  await wait()
  return { gas, ctl, $, window: dom.window, close: () => dom.window.close(), select(names) {
    const files = names.map((name) => ({ name, type: "image/jpeg", size: 40, arrayBuffer: async () => new Uint8Array([255,216,255,217]).buffer }))
    Object.defineProperty($("photo-files"), "files", { configurable: true, value: files })
    $("photo-files").dispatchEvent(new dom.window.Event("change"))
  } }
}
test("P3画面：2枚目だけ失敗→保存を止める→再送→順序変更→日記保存", async () => {
  const ui = await boot()
  try {
    ui.select(["one.jpg", "two.jpg"])
    await wait(100)
    assert.equal(ui.gas.files.size, 0)
    ui.$("upload-start").click()
    await wait(150)
    assert.equal(ui.$("save").disabled, true)
    assert.match(ui.$("upload-list").textContent, /通信に失敗/)
    const buttons = () => [...ui.$("upload-list").querySelectorAll("button")]
    buttons().find((b) => b.textContent === "再送").click()
    await wait(100)
    assert.equal(ui.gas.files.size, 2)
    assert.equal(ui.$("save").disabled, false)
    buttons().filter((b) => b.textContent === "前へ")[1].click()
    assert.match(ui.$("upload-list").querySelector("p").textContent, /two.jpg/)
    ui.$("ai-consent").checked = true
    ui.$("draft").click(); await wait(100)
    assert.equal(ui.$("f-title").value, "")
    ui.$("apply-draft").click()
    assert.equal(ui.$("f-title").value, "下書き")
    ui.$("f-body").value = "手直しした本文"
    ui.$("form").dispatchEvent(new ui.window.Event("submit", { cancelable: true })); await wait(150)
    assert.equal(ui.$("view-detail").hidden, false)
    assert.equal(ui.$("detail-body").textContent, "手直しした本文")
    const posts = ui.gas.call("getAll").data.posts
    assert.deepEqual(posts[0].images.map((i) => i.file_id), JSON.parse(JSON.stringify(ui.gas.run('AssetRepository.list(true).filter((a)=>a.storage_kind==="drive").map((a)=>a.id).reverse()'))))
    assert.ok(ui.ctl.calls.includes("getPhoto"))
  } finally { ui.close() }
})
test("P3画面：失敗画像を明示的に外せば成功分だけで保存できる", async () => {
  const ui = await boot()
  try {
    ui.select(["one.jpg", "two.jpg"]); await wait(100); ui.$("upload-start").click(); await wait(150)
    const remove = [...ui.$("upload-list").querySelectorAll("button")].filter((b) => b.textContent === "外す")
    remove[1].click()
    assert.equal(ui.$("save").disabled, false)
    assert.equal(ui.gas.files.size, 1)
  } finally { ui.close() }
})
