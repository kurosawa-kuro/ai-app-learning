// 画面の通しテスト。本物の index.html（css・js を展開）を jsdom で開き、google.script.run を模擬 GAS につなぐ。
import { test } from "node:test"
import assert from "node:assert/strict"
import { JSDOM } from "jsdom"
import { createGas, renderIndex } from "./gas-mock.mjs"

const wait = (ms = 40) => new Promise((r) => setTimeout(r, ms))

/** 1 つの画面を起動する。hash は URL の # 以降（"new" / "post-1" / "tag-11"）。 */
async function boot({ hash = "", prepare = () => {} } = {}) {
  const gas = createGas()
  gas.run("withLock_(() => Seeder.ensure())")
  prepare(gas)
  const config = JSON.parse(JSON.stringify(gas.run("clientConfig_()"))) // doGet と同じ起動時の設定
  const ctl = { failNext: false, confirm: true, history: [], handler: null, calls: [] }

  const dom = new JSDOM(renderIndex(config), {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(window) {
      window.scrollTo = () => {}
      window.confirm = () => ctl.confirm
      const runner = (ok, ng) => new Proxy({}, {
        get(_, name) {
          if (name === "withSuccessHandler") return (f) => runner(f, ng)
          if (name === "withFailureHandler") return (f) => runner(ok, f)
          return (...args) => {
            ctl.calls.push(name)
            setTimeout(() => {
              if (ctl.failNext) {
                ctl.failNext = false
                ng(new Error("network"))
                return
              }
              ok(gas.call(name, ...args))
            }, 5)
          }
        },
      })
      window.google = {
        script: {
          get run() { return runner(null, null) },
          history: {
            push: (state, _p, h) => ctl.history.push({ state, hash: h }),
            replace: (state, _p, h) => { ctl.history[ctl.history.length - 1] = { state, hash: h } },
            setChangeHandler: (f) => { ctl.handler = f },
          },
          url: { getLocation: (cb) => setTimeout(() => { ctl.history.push({ state: null, hash }); cb({ hash }) }, 0) },
        },
      }
      // スマホの「戻る」/ history.back()：1 段戻して変更ハンドラを呼ぶ
      window.history.back = () => setTimeout(() => {
        ctl.history.pop()
        const top = ctl.history[ctl.history.length - 1]
        ctl.handler({ state: top.state, location: { hash: top.hash } })
      }, 5)
    },
  })
  const { window } = dom
  const doc = window.document
  const $ = (id) => doc.getElementById(id)
  await wait(80)
  return {
    gas, ctl, window, doc, $,
    visible: (id) => !$(id).hidden,
    cards: () => [...doc.querySelectorAll("#list .admin-news-card")],
    titles: () => [...doc.querySelectorAll("#list .item-title")].map((n) => n.textContent),
    chip: (box, name) => [...$(box).querySelectorAll(".app-chip")].find((c) => c.textContent === name),
    photo: (id) => $("image-picker").querySelector(`[data-id="${id}"]`),
    submit: () => $("form").dispatchEvent(new window.Event("submit", { cancelable: true })),
    type: (id, value) => {
      $(id).value = value
      $(id).dispatchEvent(new window.Event("input"))
    },
    postRows: () => gas.sheets.get("v2_posts").getLastRow() - 1,
    close: () => window.close(),
  }
}

test("一覧：50件ずつ追加・失敗再送・タグ切替後の遅延応答を扱う", async () => {
  const ui = await boot({ prepare(g) {
    g.run(`withLock_(()=>SheetStore.append("posts",Array.from({length:120},(_,i)=>({
      id:"page-"+i,title:"ページ"+i,body:"本文",created_at:new Date()
    }))))`)
  } })
  try {
    assert.equal(ui.cards().length, 50)
    assert.equal(ui.$("list-count").textContent, "50 / 122 件")
    ui.ctl.failNext = true
    ui.$("list-more").click(); await wait(80)
    assert.equal(ui.cards().length, 50)
    ui.$("list-status").querySelector("button").click(); await wait(80)
    assert.equal(ui.cards().length, 100)
    ui.$("list-more").click(); await wait(80)
    assert.equal(ui.cards().length, 122)
    assert.equal(ui.$("list-more").hidden, true)
    ui.cards()[110].click(); await wait(80)
    assert.ok(ui.visible("view-detail"))
    ui.window.App.router.go({ view:"list",tag:null }, "push"); await wait(80)
    ui.$("reload").click(); await wait(80)
    assert.equal(ui.cards().length, 50)
    const pending = []
    ui.window.App.api.getAll = (...args) => new Promise(resolve => pending.push({args,resolve}))
    ui.$("list-more").click()
    ui.chip("tag-filter", "スイーツ").click(); await wait(40)
    assert.equal(pending.length, 2)
    pending[1].resolve(ui.gas.call("getAll", ...pending[1].args).data); await wait()
    const filtered = ui.titles()
    pending[0].resolve(ui.gas.call("getAll", ...pending[0].args).data); await wait()
    assert.deepEqual(ui.titles(), filtered)
    assert.ok(ui.cards().length < 50)
  } finally { ui.close() }
})

test("一覧：再取得中・完了後も変更のないカードと画像を保持する", async () => {
  const ui = await boot()
  try {
    const card = ui.cards()[0], image = card.querySelector("img")
    ui.$("reload").click()
    assert.equal(ui.cards()[0], card)
    await wait(80)
    assert.equal(ui.cards()[0], card)
    assert.equal(ui.cards()[0].querySelector("img"), image)
    ui.ctl.failNext = true
    ui.$("reload").click()
    await wait(80)
    assert.equal(ui.cards()[0], card)
    assert.match(ui.$("list-status").textContent, /通信に失敗/)
  } finally { ui.close() }
})

test("一覧：同じ条件の古い応答で新しい一覧を上書きしない", async () => {
  const ui = await boot()
  try {
    const pending = []
    ui.window.App.api.getAll = () => new Promise(resolve => pending.push(resolve))
    ui.$("reload").click(); ui.$("reload").click()
    const data = ui.gas.call("getAll", null).data
    const latest = { ...data, posts: data.posts.map(p => ({ ...p, title: "最新の内容" })) }
    pending[1](latest); await wait()
    pending[0](data); await wait()
    assert.ok(ui.titles().every(title => title === "最新の内容"))
  } finally { ui.close() }
})

test("一覧：起動すると日記が新しい順に並び、キーワードで絞り込める", async () => {
  const ui = await boot()
  assert.ok(ui.visible("view-list"))
  assert.equal(ui.$("app-name").textContent, "GAS日記") // data/config.yaml の app.name
  assert.deepEqual(ui.titles(), ["休日のお出かけ", "カフェに行った"])
  assert.equal(ui.$("list-count").textContent, "2 件")
  assert.equal(ui.$("tag-filter").querySelectorAll(".app-chip").length, 9) // すべて＋8
  assert.ok(ui.cards()[1].querySelector("img").src.startsWith("data:image/svg+xml"))
  assert.match(ui.cards()[1].querySelector("small").textContent, /^\d{4}\/\d{2}\/\d{2}（.）\s\d{2}:\d{2}$/)

  ui.chip("tag-filter", "スイーツ").click(); await wait(60)
  assert.deepEqual(ui.titles(), ["カフェに行った"])
  assert.equal(ui.$("list-heading").textContent, "「スイーツ」の日記")
  assert.equal(ui.chip("tag-filter", "スイーツ").getAttribute("aria-pressed"), "true")
  assert.equal(ui.ctl.history.at(-1).hash, "tag-12")

  ui.chip("tag-filter", "読書").click(); await wait(60)
  assert.match(ui.$("list-status").textContent, /このキーワードの日記はまだありません/)

  ui.chip("tag-filter", "すべて").click(); await wait(60)
  assert.equal(ui.titles().length, 2)
  ui.close()
})

test("詳細：カードを開くと全画像・本文・全タグが出て、タグから一覧の絞り込みへ移れる", async () => {
  const ui = await boot()
  assert.deepEqual(ui.ctl.calls, [], "起動時に一覧を取りに行っている（対応 A）")
  ui.cards()[1].click(); await wait(60)
  assert.deepEqual(ui.ctl.calls, [], "一覧から詳細を開くのに往復している（対応 B）")
  assert.ok(ui.visible("view-detail"))
  assert.equal(ui.$("detail-title").textContent, "カフェに行った")
  assert.match(ui.$("detail-date").textContent, /^\d{4}年\d{1,2}月\d{1,2}日（.）/)
  assert.equal(ui.$("detail-images").querySelectorAll("img").length, 2)
  assert.equal(ui.$("detail-body").textContent, "今日はカフェでケーキを食べた。\n窓ぎわの席が空いていて、ゆっくりできた。")
  assert.equal(ui.$("detail-tags").querySelectorAll(".app-chip").length, 3)

  ui.chip("detail-tags", "休日").click(); await wait(60)
  assert.ok(ui.visible("view-list"))
  assert.equal(ui.$("list-heading").textContent, "「休日」の日記")
  ui.close()
})

test("詳細：一覧へ戻るはブラウザ履歴を辿らず絞込一覧を表示する", async () => {
  const ui = await boot({ hash: "tag-11" })
  let nativeBackCalls = 0
  ui.window.history.back = () => { nativeBackCalls++ }
  ui.cards()[0].click(); await wait(60)
  ui.$("detail-back").click(); await wait(60)
  assert.ok(ui.visible("view-list"))
  assert.equal(nativeBackCalls, 0)
  assert.equal(ui.ctl.history.at(-1).hash, "tag-11")
  ui.close()
})

test("詳細：無い日記の URL は「日記が見つかりません」", async () => {
  const ui = await boot({ hash: "post-nope" })
  assert.ok(ui.visible("view-detail"))
  assert.equal(ui.$("detail-title").textContent, "日記が見つかりません")
  assert.ok(ui.$("detail-card").hidden)
  ui.close()
})

test("一覧：絞り込みの URL（#tag-11）を直接開ける", async () => {
  const ui = await boot({ hash: "tag-11" })
  assert.equal(ui.$("list-heading").textContent, "「休日」の日記")
  assert.equal(ui.titles().length, 2)
  ui.close()
})

test("作成：写真とキーワードを選び、AI 下書きを入れ、保存すると詳細へ移り、戻ると一覧の先頭にある", async () => {
  const ui = await boot()
  ui.$("add").click(); await wait()
  assert.ok(ui.visible("view-form"))

  ui.submit(); await wait()
  assert.match(ui.$("form-error").textContent, /タイトルを入力/)
  ui.$("draft").click(); await wait()
  assert.match(ui.$("form-error").textContent, /写真かキーワード/)
  assert.equal(ui.ctl.calls.length, 0) // 起動時の一覧は HTML に入っている（対応 A）。検証に落ちたら送らない

  ui.photo("sample-d").click()
  ui.photo("sample-a").click()
  assert.equal(ui.photo("sample-d").querySelector(".app-photo__order").textContent, "1")
  assert.equal(ui.photo("sample-a").querySelector(".app-photo__order").textContent, "2")
  ui.chip("tag-picker", "旅行").click()
  assert.equal(ui.chip("tag-picker", "旅行").getAttribute("aria-pressed"), "true")

  ui.$("draft").click(); await wait(60)
  assert.equal(ui.$("f-title").value, "ゆったり過ごした一日")
  assert.ok(ui.$("f-body").value.length > 10)

  // 1 行の入力欄の Enter では送信しない（日本語入力の確定で保存されないように）
  const enter = new ui.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
  ui.$("f-title").dispatchEvent(enter)
  assert.equal(enter.defaultPrevented, true)

  ui.type("f-title", "海を見に行った")
  ui.submit(); ui.submit(); ui.submit() // 連打
  await wait(120)
  assert.equal(ui.postRows(), 3, "連打で 2 件以上できた")
  assert.ok(ui.visible("view-detail"))
  assert.equal(ui.$("detail-title").textContent, "海を見に行った")
  assert.deepEqual([...ui.$("detail-images").querySelectorAll("img")].map((i) => i.alt), ["海の写真", "カフェの写真"])
  assert.equal(ui.$("toast").textContent, "保存しました")

  ui.$("detail-back").click(); await wait(80)
  assert.ok(ui.visible("view-list"))
  assert.equal(ui.titles()[0], "海を見に行った")
  assert.ok(ui.cards()[0].classList.contains("is-new"))
  assert.ok(ui.ctl.history.every(entry => entry.hash !== "new"), "履歴に作成画面が残っている")
  ui.close()
})

test("作成：通信に失敗しても入力は残り、もう一度保存できる", async () => {
  const ui = await boot({ hash: "new" })
  ui.type("f-title", "題")
  ui.type("f-body", "本文")
  ui.ctl.failNext = true
  ui.submit(); await wait(60)
  assert.ok(ui.visible("view-form"))
  assert.match(ui.$("form-error").textContent, /通信に失敗/)
  assert.equal(ui.$("f-title").value, "題")
  assert.equal(ui.$("save").disabled, false)
  ui.submit(); await wait(80)
  assert.ok(ui.visible("view-detail"))
  assert.equal(ui.postRows(), 3)
  ui.close()
})

test("v2画面：保存済み応答を失った後の編集は元の日記を表示し、二重保存しない", async () => {
  const ui = await boot({ hash: "new" })
  try {
    const original = ui.window.App.api.create
    let first = true
    ui.window.App.api.create = async (...args) => {
      const result = await original(...args)
      if (first) { first = false; throw { code: "network", message: "応答を受信できません" } }
      return result
    }
    ui.type("f-title", "保存済み")
    ui.type("f-body", "最初の本文")
    ui.submit(); await wait(80)
    ui.type("f-body", "変更した本文")
    ui.submit(); await wait(100)
    assert.equal(ui.postRows(), 3)
    assert.equal(ui.$("detail-body").textContent, "最初の本文")
    assert.ok(ui.ctl.calls.includes("cancelCreate"))
  } finally { ui.close() }
})

test("v2画面：未到着保存の内容変更は旧要求を中止して保存する", async () => {
  const ui = await boot({ hash: "new" })
  try {
    ui.type("f-title", "変更")
    ui.type("f-body", "最初")
    ui.ctl.failNext = true
    ui.submit(); await wait(80)
    ui.type("f-body", "新しい本文")
    ui.submit(); await wait(100)
    assert.equal(ui.postRows(), 3)
    assert.equal(ui.$("detail-body").textContent, "新しい本文")
    assert.equal(ui.gas.run('RequestRepository.find(SheetStore.readFresh("post_create_requests")[0].request_id).state'), "cancelled")
  } finally { ui.close() }
})

test("v2画面：生成の応答喪失は同じ要求で再取得し、採用元を解除できる", async () => {
  const ui = await boot({ hash: "new" })
  try {
    const original = ui.window.App.api.generateDraft
    let first = true
    ui.window.App.api.generateDraft = async (...args) => {
      const result = await original(...args)
      if (first) { first = false; throw { code: "network", message: "応答を受信できません" } }
      return result
    }
    ui.photo("sample-a").click()
    ui.$("draft").click(); await wait(80)
    ui.$("draft").click(); await wait(80)
    assert.equal(ui.gas.run('GenerationRepository.list().length'), 1)
    ui.$("clear-generation").click()
    ui.submit(); await wait(80)
    assert.equal(ui.gas.call("getAll").data.posts[0].source_generation_id, "")
  } finally { ui.close() }
})

test("作成：書きかけで戻るときは確認し、破棄しなければ残る", async () => {
  const ui = await boot()
  ui.$("add").click(); await wait()
  ui.type("f-title", "書きかけ")
  ui.ctl.confirm = false
  ui.$("back").click(); await wait()
  assert.ok(ui.visible("view-form"))
  assert.equal(ui.$("f-title").value, "書きかけ")

  ui.ctl.confirm = true
  ui.window.history.back(); await wait(60) // スマホの「戻る」
  assert.ok(ui.visible("view-list"))
  ui.close()
})

test("計測（#perf）：4 種類を 5 回ずつ呼び、結果を表と文字で出す", async () => {
  const ui = await boot({ hash: "perf" })
  assert.ok(ui.visible("view-perf"))
  ui.$("perf-run").click(); await wait(600)
  assert.equal(ui.$("perf-rows").querySelectorAll("tr").length, 4)
  assert.equal(ui.ctl.calls.filter((c) => c.startsWith("perf")).length, 20)
  assert.match(ui.$("perf-text").value, /固定の文字を返すだけ（GAS の往復そのもの）：往復 中央値 \d+ ms/)
  ui.close()
})

 test("新規：一覧へ戻るは書きかけ確認後もブラウザ履歴を辿らない", async () => {
  const ui = await boot()
  try {
    let nativeBackCalls = 0
    ui.window.history.back = () => { nativeBackCalls++ }
    ui.$("add").click(); await wait()
    ui.type("f-title", "書きかけ")
    ui.ctl.confirm = false
    ui.$("back").click(); await wait()
    assert.ok(ui.visible("view-form"))
    ui.ctl.confirm = true
    ui.$("back").click(); await wait()
    assert.ok(ui.visible("view-list"))
    assert.equal(nativeBackCalls, 0)
    assert.equal(ui.ctl.history.at(-1).hash, "")
  } finally { ui.close() }
})
