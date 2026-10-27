import { test } from "node:test"
import assert from "node:assert/strict"
import { driveGas, png } from "./drive-mock.mjs"
import { buildPreferences } from "../scripts/build-data.mjs"

test("G3b：文体と内容ルールだけを採用し、空設定・上限を扱う", () => {
  assert.equal(buildPreferences("## 文体\n- 穏やか\n## 任意設定\n- 秘密\n## 内容のルール\n- 推測しない"), "穏やか\n推測しない")
  assert.equal(buildPreferences(""), "")
  assert.throws(() => buildPreferences("## 文体\n- " + "あ".repeat(2000)), /4KiB/)
})
test("G4a/G4b：実画像のみを順番どおり送信し、取得失敗は黙って省かない", () => {
  const gas = driveGas()
  gas.run('APP_CONFIG.providers.photo="drive"; APP_CONFIG.providers.draft="gemini"; GeminiClient.generateText = (r) => {globalThis.sent=r;return {ok:true,text:JSON.stringify({title:"作例",body:"確認用"})}}')
  const ids = [1, 2].map((n) => gas.call("uploadPhoto", { uploadId: `image-ai-000${n}`, mimeType: "image/png", base64: png }).data.file_id)
  assert.equal(gas.call("generateDraft", { requestId: "test-gen-1", imageIds: [ids[0]], aiConsent: true }).ok, true)
  assert.equal(gas.context.sent.images.length, 1)
  assert.equal(gas.call("generateDraft", { requestId: "test-gen-2", imageIds: ids.slice().reverse(), aiConsent: true }).ok, true)
  assert.equal(gas.context.sent.images.length, 2)
  assert.equal(gas.context.sent.images[0].base64, png)
  const config = gas.run("clientConfig_()")
  assert.equal(JSON.stringify(config).includes("一人称"), false)
  assert.ok(gas.context.sent.text.includes("一人称"))
  gas.files.get(gas.run(`AssetRepository.find("${ids[1]}",true).storage_key`)).getSharingAccess = () => "ANYONE"
  assert.equal(gas.call("generateDraft", { requestId: "test-gen-3", imageIds: ids, aiConsent: true }).ok, false)
})
