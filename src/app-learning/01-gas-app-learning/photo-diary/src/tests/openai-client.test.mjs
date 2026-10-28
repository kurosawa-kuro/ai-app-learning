import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"

const source = ["config/integration-settings.js", "services/draft/openai-client.js", "services/draft/openai-probe.js", "controllers/setup.js"]
  .map((p) => readFileSync(new URL(`../server/${p}`, import.meta.url), "utf8")).join("\n")
const success = { status: "completed", output: [{type:"message",content:[{type:"output_text",text:"こんにちは！"}]}], usage:{total_tokens:12} }
function setup({ status = 200, body = success, key = "test-secret", model, throws = false } = {}) {
  const calls = [], logs = []
  const api = runInNewContext(`${source}\n({ hello: () => OpenAIProbe.hello(), run: testOpenAIHello })`, {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (name) => ({ OPENAI_API_KEY: key, OPENAI_MODEL: model })[name] }) },
    UrlFetchApp: { fetch: (url, options) => {
      calls.push({ url, options })
      if (throws) throw new Error(key)
      return { getResponseCode: () => status, getContentText: () => typeof body === "string" ? body : JSON.stringify(body) }
    } },
    console: { log: (value) => logs.push(value) },
  })
  return { ...api, calls, logs }
}

test("G2：固定挨拶を1回だけ送り、本文・モデル・使用量を確認する", () => {
  const app = setup()
  const result = app.hello()
  assert.equal(result.text, "こんにちは！")
  assert.equal(result.apiAuthenticationVerified, true)
  assert.equal(result.usage.totalTokenCount, 12)
  assert.equal(app.calls.length, 1)
  const { url, options } = app.calls[0]
  assert.equal(url, "https://api.openai.com/v1/responses")
  assert.equal(options.headers.Authorization, "Bearer test-secret")
  assert.equal(url.includes("test-secret"), false)
  assert.equal(options.followRedirects, false)
  assert.equal(JSON.parse(options.payload).input[0].content[0].text, "こんにちは。短く挨拶を返してください")
  assert.equal(JSON.parse(options.payload).max_output_tokens, 256)
})

test("G2：未設定・不正モデルは通信せず、モデル設定を反映する", () => {
  for (const [options, code] of [[{ key: " " }, "missing_api_key"], [{ model: "../invalid" }, "invalid_model"]]) {
    const app = setup(options)
    assert.equal(app.hello().code, code)
    assert.equal(app.calls.length, 0)
  }
  assert.equal(setup({ model: "gpt-test" }).hello().model, "gpt-test")
})

test("G2：HTTP失敗を区別し、秘密を含むエラー本文は返さず再試行しない", () => {
  for (const [status, code] of [[400, "invalid_request_or_key"], [401, "authentication_error"], [403, "permission_denied"], [404, "model_not_found"], [429, "quota_exceeded"], [503, "service_unavailable"]]) {
    const app = setup({ status, body: "test-secret" })
    const result = app.hello()
    assert.equal(result.code, code)
    assert.equal(result.apiAuthenticationVerified, false)
    assert.equal(JSON.stringify(result).includes("test-secret"), false)
    assert.equal(app.calls.length, 1)
  }
  assert.equal(setup({ throws: true }).hello().code, "transport_or_permission_error")
})

test("G2：不正JSON・空・ブロック・途中終了を成功扱いしない", () => {
  for (const body of ["not json", null, {}, { promptFeedback: { blockReason: "SAFETY" } }, { candidates: [{ finishReason: "MAX_TOKENS" }] }, { candidates: [{ finishReason: "STOP", content: { parts: [{ text: " " }] } }] }]) {
    assert.equal(setup({ body }).hello().ok, false)
  }
})

test("G2：エディタ入口は返却せず、ログにもキーや思考を出さない", () => {
  const app = setup({ body: {status:"completed",output:[{type:"reasoning",content:[{type:"output_text",text:"internal-thought"}]},{type:"message",content:[{type:"output_text",text:"こんにちは test-secret"}]}]} })
  assert.equal(app.run(), undefined)
  assert.equal(app.logs.length, 1)
  assert.equal(app.logs[0].includes("test-secret"), false)
  assert.equal(app.logs[0].includes("internal-thought"), false)
})
