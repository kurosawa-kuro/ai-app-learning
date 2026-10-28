import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"

function setup(properties = {}, options = {}) {
  const logs = []
  let reads = 0
  const code = ["config/integration-settings.js", "services/integration-setup.js", "controllers/setup.js"]
    .map((name) => readFileSync(new URL(`../server/${name}`, import.meta.url), "utf8")).join("\n")
  const result = runInNewContext(`${code}\n({ drive: checkDriveSetup_, openai: checkOpenAISetup_, runDrive: checkDriveSetup, runOpenAI: checkOpenAISetup })`, {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => properties[key] ?? null }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => "owner@example.test" }) },
    DriveApp: {
      Access: { PRIVATE: "PRIVATE" },
      getFolderById: () => {
        reads++
        if (options.fail) throw new Error("provider details must not leak")
        return {
          getOwner: () => ({ getEmail: () => options.owner ?? "owner@example.test" }),
          getSharingAccess: () => options.access ?? "PRIVATE",
          getEditors: () => options.editors ?? [],
          getViewers: () => [],
          isTrashed: () => options.trashed ?? false,
          getName: () => "photos",
        }
      },
    },
    console: { log: (value) => logs.push(value) },
  })
  return { ...result, logs, reads: () => reads }
}

test("エディタ用入口は診断結果をログに出し、クライアントへ返さない", () => {
  const app = setup({ PHOTO_FOLDER_ID: "folder", OPENAI_API_KEY: "test-secret" })
  assert.equal(app.runDrive(), undefined)
  assert.equal(app.runOpenAI(), undefined)
  assert.equal(JSON.parse(app.logs[0]).code, "drive_read_verified")
  assert.equal(JSON.parse(app.logs[1]).code, "key_configured_not_validated")
  assert.equal(app.logs.join().includes("test-secret"), false)
})

test("認証準備：フォルダ未設定ならDriveを呼ばない", () => {
  const app = setup()
  assert.equal(app.drive().code, "missing_folder_id")
  assert.equal(app.reads(), 0)
})

test("認証準備：非公開・所有者一致を確認しても書込成功とは報告しない", () => {
  const result = setup({ PHOTO_FOLDER_ID: "folder" }).drive()
  assert.equal(result.ok, true)
  assert.equal(result.writeVerified, false)
  for (const options of [{ owner: "other@example.test" }, { access: "ANYONE" }, { editors: ["other"] }, { trashed: true }]) {
    assert.equal(setup({ PHOTO_FOLDER_ID: "folder" }, options).drive().ok, false)
  }
})

test("認証準備：Driveの例外詳細を診断ログに露出しない", () => {
  const app = setup({ PHOTO_FOLDER_ID: "folder" }, { fail: true })
  assert.equal(app.drive().code, "drive_access_failed")
  assert.equal(app.logs.join().includes("provider details"), false)
})

test("認証準備：キーの存在だけを返し、キー値や認証成功を出さない", () => {
  const secret = "test-only-private-value"
  const app = setup({ OPENAI_API_KEY: secret })
  const result = app.openai()
  assert.equal(result.keyConfigured, true)
  assert.equal(result.apiAuthenticationVerified, false)
  assert.equal(result.inferenceExecuted, false)
  assert.equal(JSON.stringify(result).includes(secret), false)
  assert.equal(app.logs.join().includes(secret), false)
  assert.equal(setup({ OPENAI_API_KEY: "  " }).openai().keyConfigured, false)
})
