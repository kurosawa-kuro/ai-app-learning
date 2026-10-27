import { test } from "node:test"
import assert from "node:assert/strict"
import { createGas } from "./gas-mock.mjs"
import { driveGas, png } from "./drive-mock.mjs"
import { failNextWrite, rows, snapshot } from "./failure-helpers.mjs"

const ok = result => { assert.equal(result.ok, true, JSON.stringify(result.error)); return result.data }
const ready = () => {
  const gas = createGas({ now: "2026-10-01T00:00:00Z" })
  gas.context.console.error = () => {}
  gas.run("withLock_(() => Seeder.ensure())")
  return gas
}
const input = { title: "障害からの回復", body: "本文", imageIds: ["sample-b", "sample-a"], tagIds: ["11", "10"] }

// 成功したか不明な書込も含め、台帳→子→親の各境界で同一要求を再送する。
for (const table of ["post_create_requests", "post_assets", "post_tags", "posts"]) {
  for (const after of [false, true]) {
    test("保存回復: " + table + (after ? " 書込直後" : " 書込直前"), () => {
      const gas = ready()
      const fault = failNextWrite(gas, table, { after })
      assert.equal(gas.call("create", input, "recover-request").ok, false)
      assert.equal(fault.fired, true)
      assert.equal(gas.lock.held, false, "失敗後にロックを解放する")
      assert.equal(ok(gas.call("getAll")).posts.length, table === "posts" && after ? 3 : 2,
        "親保存前の部分データを一覧へ出さない")
      fault.restore()
      const post = ok(gas.call("create", input, "recover-request"))
      const again = ok(gas.call("create", input, "recover-request"))
      assert.deepEqual(again, post)
      assert.equal(rows(gas, "posts").length, 3)
      const assets = rows(gas, "post_assets").filter(r => r.post_id === post.id)
      assert.deepEqual(assets.map(r => r.asset_id), ["sample-b", "sample-a"])
      assert.deepEqual(assets.map(r => r.sort_order), [1, 2])
      assert.deepEqual(rows(gas, "post_tags").filter(r => r.post_id === post.id).map(r => r.tag_id).sort(), ["10", "11"])
      assert.equal(rows(gas, "post_create_requests").length, 1)
      assert.equal(rows(gas, "post_create_requests")[0].state, "succeeded")
    })
  }
}

test("部分保存を中止すると子を整理し、遅延した保存要求でも復活しない", () => {
  const gas = ready()
  const fault = failNextWrite(gas, "posts")
  assert.equal(gas.call("create", input, "cancel-partial").ok, false)
  fault.restore()
  const reserved = rows(gas, "post_create_requests")[0]
  assert.ok(rows(gas, "post_assets").some(r => r.post_id === reserved.post_id))
  assert.equal(ok(gas.call("cancelCreate", "cancel-partial")).state, "cancelled")
  for (const table of ["post_assets", "post_tags"]) assert.equal(rows(gas, table).filter(r => r.post_id === reserved.post_id).length, 0)
  assert.equal(gas.call("create", input, "cancel-partial").error.code, "request_cancelled")
  assert.equal(rows(gas, "posts").length, 2)
})

test("ロック競合時は保存もAI予約も書かず、他の実行のロックを解放しない", () => {
  const gas = ready(), before = snapshot(gas), releases = gas.lock.releases
  gas.lock.held = true
  assert.equal(gas.call("create", input, "busy-save").error.code, "busy")
  assert.equal(gas.call("generateDraft", { requestId: "busy-ai", tagIds: ["11"] }).error.code, "busy")
  assert.equal(snapshot(gas), before)
  assert.equal(gas.lock.releases, releases)
  assert.equal(gas.lock.held, true)
  gas.lock.held = false
  ok(gas.call("create", input, "busy-save"))
})

test("AI実行はロック外、実行中の同じ要求は外部呼出を増やさない", () => {
  const gas = ready()
  const request = { requestId: "concurrent-ai", tagIds: ["11"] }
  let calls = 0
  gas.context.providerProbe = () => {
    calls++
    assert.equal(gas.lock.held, false)
    assert.equal(rows(gas, "ai_generations")[0].state, "running")
    assert.equal(gas.call("generateDraft", request).error.code, "generation_pending")
    // AI待ち中も別の日記を保存できる。
    ok(gas.call("create", input, "during-ai"))
    return { title: "下書き", body: "本文", mock: true }
  }
  gas.run("MockDraftProvider.generate = providerProbe")
  const draft = ok(gas.call("generateDraft", request))
  assert.equal(ok(gas.call("generateDraft", request)).generationId, draft.generationId)
  assert.equal(calls, 1)
  assert.equal(gas.lock.held, false)
})

test("生成結果の保存障害後は15分を超えても自動再生成しない", () => {
  const gas = ready()
  let calls = 0
  gas.context.providerProbe = () => {
    calls++
    failNextWrite(gas, "ai_generations")
    return { title: "下書き", body: "本文", mock: true }
  }
  gas.run("MockDraftProvider.generate = providerProbe")
  const request = { requestId: "lost-result", tagIds: ["11"] }
  assert.equal(gas.call("generateDraft", request).ok, false)
  gas.clock.advance(15 * 60000)
  assert.equal(gas.call("generateDraft", request).error.code, "generation_pending")
  assert.equal(rows(gas, "ai_generations")[0].state, "running")
  gas.clock.advance(1)
  assert.equal(gas.call("generateDraft", request).ok, false)
  assert.equal(rows(gas, "ai_generations")[0].state, "unknown")
  assert.equal(gas.call("generateDraft", request).error.code, "generation_unknown")
  assert.equal(calls, 1)
})

test("生成履歴は保持期間内に消せず、30日超の手動整理・再実行でも採用済み本文を保つ", () => {
  const gas = ready()
  const draft = ok(gas.call("generateDraft", { requestId: "retention", tagIds: ["11"] }))
  const post = ok(gas.call("create", { title: draft.title, body: "編集後の本文", sourceGenerationId: draft.generationId }, "adopt"))
  const duration = 30 * 86400000
  gas.clock.advance(duration - 1)
  assert.equal(ok(gas.call("listGenerationHistoryForCleanup")).length, 0)
  assert.equal(gas.call("purgeGenerationHistory", draft.generationId).error.code, "in_use")
  gas.clock.advance(1)
  assert.equal(ok(gas.call("listGenerationHistoryForCleanup")).length, 0, "現在の仕様は30日ちょうども保持")
  gas.clock.advance(1)
  assert.equal(ok(gas.call("listGenerationHistoryForCleanup")).length, 1)
  assert.notEqual(rows(gas, "ai_generations")[0].output_body, "", "時刻が過ぎても自動削除しない")
  ok(gas.call("purgeGenerationHistory", draft.generationId))
  ok(gas.call("purgeGenerationHistory", draft.generationId))
  const saved = ok(gas.call("getOne", post.id))
  assert.equal(saved.body, "編集後の本文")
  assert.equal(saved.source_generation_id, draft.generationId)
  assert.equal(rows(gas, "ai_generations")[0].output_body, "")
})

test("6時間のキャッシュ期限後はシートの変更を再読込する", () => {
  const gas = ready()
  const first = ok(gas.call("getAll"))
  const id = first.posts[0].id
  const sheet = gas.sheets.get("v2_posts")
  const index = sheet.rows.findIndex(row => row[0] === id)
  sheet.getRange(index + 1, 2).setValues([["シートで変更"]])
  gas.clock.advance(21600000 - 1)
  assert.notEqual(ok(gas.call("getOne", id)).title, "シートで変更")
  gas.clock.advance(1)
  assert.equal(ok(gas.call("getOne", id)).title, "シートで変更")
})

test("CacheService停止中も一覧と保存は正しいデータを返す", () => {
  const gas = ready()
  ok(gas.call("getAll"))
  gas.context.CacheService.getScriptCache = () => { throw Error("cache unavailable") }
  const post = ok(gas.call("create", input, "cache-down"))
  assert.equal(ok(gas.call("getAll")).posts.length, 3)
  assert.equal(ok(gas.call("getOne", post.id)).body, input.body)
})

for (const after of [false, true]) {
  test("Drive作成" + (after ? "直後" : "直前") + "の障害から再送してもファイルと資産を増やさない", () => {
    const gas = driveGas()
    gas.context.console.error = () => {}
    const create = gas.folder.createFile
    gas.folder.createFile = data => {
      if (after) create(data)
      throw Error("Drive response lost")
    }
    const request = { uploadId: "drive-recovery-001", mimeType: "image/png", base64: png }
    assert.equal(gas.call("uploadPhoto", request).ok, false)
    assert.equal(gas.files.size, after ? 1 : 0)
    assert.equal(gas.lock.held, false)
    gas.folder.createFile = create
    const asset = ok(gas.call("uploadPhoto", request))
    assert.equal(ok(gas.call("uploadPhoto", request)).asset_id, asset.asset_id)
    assert.equal(gas.files.size, 1)
    assert.equal(rows(gas, "assets").filter(r => r.storage_kind === "drive").length, 1)
    assert.equal(rows(gas, "upload_requests").length, 1)
    assert.equal(rows(gas, "upload_requests")[0].state, "succeeded")
    assert.equal(ok(gas.call("getPhoto", asset.asset_id)).base64, png)
  })
}

for (const change of ["共有化", "別フォルダ", "削除"]) {
  test("アップロード後の" + change + "を読取時に再検証する", () => {
    const gas = driveGas()
    const asset = ok(gas.call("uploadPhoto", { uploadId: "read-check-001", mimeType: "image/png", base64: png }))
    ok(gas.call("getPhoto", asset.asset_id))
    const file = [...gas.files.values()][0]
    if (change === "共有化") file.getSharingAccess = () => "ANYONE"
    if (change === "別フォルダ") file.getParents = () => ({ hasNext: () => false })
    if (change === "削除") file.setTrashed(true)
    assert.equal(gas.call("getPhoto", asset.asset_id).ok, false)
    assert.equal(gas.call("uploadPhoto", { uploadId: "read-check-001", mimeType: "image/png", base64: png }).ok, false)
    assert.equal(gas.files.size, 1)
  })
}
