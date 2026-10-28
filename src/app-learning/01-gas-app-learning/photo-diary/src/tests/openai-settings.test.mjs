import { test } from "node:test"
import assert from "node:assert/strict"
import { createGas } from "./gas-mock.mjs"

test("OpenAIキーは登録・削除でき、応答へ秘密を返さない", () => {
  const g = createGas()
  const key = "sk-" + "a".repeat(164)
  assert.equal(g.call("getAiSettings").data.keyConfigured, false)
  const saved = g.call("saveAiKey", key)
  assert.equal(saved.ok, true)
  assert.equal(saved.data.keyConfigured, true)
  assert.equal(JSON.stringify(saved).includes(key), false)
  assert.equal(g.props.get("OPENAI_API_KEY"), key)
  assert.equal(g.call("saveAiKey", "bad").ok, false)
  assert.equal(g.props.get("OPENAI_API_KEY"), key)
  assert.equal(g.call("saveAiKey", "").data.keyConfigured, false)
  assert.equal(g.props.has("OPENAI_API_KEY"), false)
})
