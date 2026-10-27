import { test } from "node:test"
import assert from "node:assert/strict"
import { createGas } from "./gas-mock.mjs"

function ready(response = { title: "休日", body: "散歩の時間を振り返る。" }) {
  const gas = createGas()
  gas.run('Seeder.ensure(); APP_CONFIG.providers.draft = "gemini"')
  gas.context.response = response
  gas.run('GeminiClient.generateText = (request) => { globalThis.sent = request; return { ok: true, text: JSON.stringify(response) } }')
  return gas
}
test("G3a：キーワード生成→編集→保存→詳細を通す", () => {
  const gas = ready()
  const draft = gas.call("generateDraft", { requestId: "test-gen-1", tagIds: ["11"], aiConsent: true })
  assert.equal(draft.ok, true)
  assert.equal(draft.data.mock, false)
  assert.ok(gas.context.sent.schema)
  const saved = gas.call("create", { ...draft.data, body: "編集した本文", tagIds: ["11"] }, "g3a-test")
  assert.equal(saved.ok, true)
  assert.equal(gas.call("getOne", saved.data.id).data.body, "編集した本文")
})
test("G3a：同意なし・写真のみ・不正形式・長すぎる下書きを拒否する", () => {
  const gas = ready()
  assert.equal(gas.call("generateDraft", { requestId: "test-gen-2", tagIds: ["11"] }).error.code, "consent_required")
  assert.equal(gas.call("generateDraft", { requestId: "test-gen-3", imageIds: ["sample-a"], aiConsent: true }).error.code, "invalid")
  for (const response of [null, { title: null, body: "本文" }, { title: "", body: "本文" }, { title: "題", body: "a".repeat(5001) }]) {
    assert.equal(ready(response).call("generateDraft", { requestId: "test-gen-4", tagIds: ["11"], aiConsent: true }).error.code, "invalid_draft")
  }
})
test("G3a：利用枠失敗は手入力保存を妨げず、モックへ戻せる", () => {
  const gas = ready()
  gas.run('GeminiClient.generateText = () => ({ok:false,code:"quota_exceeded"})')
  assert.equal(gas.call("generateDraft", { requestId: "test-gen-5", tagIds: ["11"], aiConsent: true }).error.code, "ai_failed")
  assert.equal(gas.call("create", { title: "手入力", body: "保存する" }, "manual").ok, true)
  gas.run('APP_CONFIG.providers.draft = "mock"')
  assert.equal(gas.call("generateDraft", { requestId: "test-gen-6", tagIds: ["11"] }).data.mock, true)
})
