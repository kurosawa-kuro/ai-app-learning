import { test } from "node:test"
import assert from "node:assert/strict"
import { createGas } from "./gas-mock.mjs"
const ok = (r) => {
  assert.equal(r.ok, true, JSON.stringify(r.error))
  return r.data
}
function ready() {
  const g = createGas()
  g.run("withLock_(()=>Seeder.ensure())")
  return g
}
test("複数タグのOR絞込みとタグ管理：改名はID維持、使用中削除を拒否", () => {
  const g = ready(),
    a = ok(g.call("changeTag", { action: "create", name: "検証A" })),
    b = ok(g.call("changeTag", { action: "create", name: "検証B" }))
  assert.equal(
    ok(g.call("changeTag", { action: "create", name: "検証A" })).id,
    a.id
  )
  const p = ok(
    g.call(
      "create",
      {
        title: "多対多",
        body: "本文",
        entryDate: "2026-02-28",
        tagIds: [a.id, b.id],
      },
      "baseline-create-01"
    )
  )
  const q = ok(
    g.call(
      "create",
      { title: "片方だけ", body: "本文", tagIds: [b.id] },
      "baseline-create-02"
    )
  )
  assert.equal(ok(g.call("getAll", a.id)).posts.length, 1)
  assert.equal(ok(g.call("getAll", a.id + "," + b.id)).posts.length, 2)
  ok(g.call("changeTag", { action: "rename", id: a.id, name: "新しい名前" }))
  assert.equal(ok(g.call("getOne", p.id)).tags[0].name, "新しい名前")
  assert.equal(
    g.call("changeTag", { action: "delete", id: a.id }).error.code,
    "in_use"
  )
  const empty = ok(g.call("changeTag", { action: "create", name: "未使用" }))
  ok(g.call("changeTag", { action: "delete", id: empty.id }))
  assert.ok(!ok(g.call("getTags")).some((t) => t.id === empty.id))
  assert.equal(ok(g.call("getOne", p.id)).entry_date, "2026-02-28")
})
test("日付・120字・タグ5個の境界。保存済みの6タグ以上は読取りで保持", () => {
  const g = ready()
  assert.equal(
    g.call(
      "create",
      { title: "日付", body: "本文", entryDate: "2026-02-30" },
      "bad-date"
    ).ok,
    false
  )
  assert.equal(
    g.call("create", { title: "a".repeat(121), body: "本文" }, "bad-title").ok,
    false
  )
  const ids = ok(g.call("getTags"))
    .slice(0, 6)
    .map((t) => t.id)
  assert.equal(
    g.call("create", { title: "タグ", body: "本文", tagIds: ids }, "bad-tags")
      .ok,
    false
  )
  assert.equal(
    ok(
      g.call(
        "create",
        { title: "a".repeat(120), body: "本文", tagIds: ids.slice(0, 5) },
        "valid-boundary"
      )
    ).tags.length,
    5
  )
  g.run("APP_CONFIG.limits.tags=10")
  const old = ok(
    g.call("create", { title: "旧記録", body: "本文", tagIds: ids }, "old-tags")
  )
  g.run("APP_CONFIG.limits.tags=5")
  assert.equal(ok(g.call("getOne", old.id)).tags.length, 6)
})
test("旧5列の日記を消さず日付列を追加。再実行は変更なし", () => {
  const g = createGas()
  g.run(
    'TABLES.posts.columns.pop();TABLES.posts.text.pop();withLock_(()=>Seeder.ensure());TABLES.posts.columns.push("entry_date");TABLES.posts.text.push("entry_date")'
  )
  const before = g.sheets.get("v2_posts").rows.map((r) => r.slice())
  assert.equal(g.call("upgradeDiaryEntryDate").changed, true)
  assert.equal(g.call("upgradeDiaryEntryDate").changed, false)
  assert.deepEqual(
    g.sheets
      .get("v2_posts")
      .rows.slice(1)
      .map((r) => r.slice(0, 5)),
    before.slice(1)
  )
  assert.equal(ok(g.call("getAll")).posts.length, 2)
})
