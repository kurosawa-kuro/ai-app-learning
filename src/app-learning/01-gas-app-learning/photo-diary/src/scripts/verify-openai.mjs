// 実送信は明示実行のみ。本文・APIキーを出力しない。
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { parse } from "yaml"
import { driveGas } from "../tests/drive-mock.mjs"

const png = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nO3NQQkAAAgEsMtkWyuY0hQ+hMH+S/WcikAgEAgEAoFAIPgSLH4b1EwmPfsfAAAAAElFTkSuQmCC"

export const cases = ["G3a_text", "G3b_preferences", "G4a_one_image", "G4b_two_images"]

export async function verifyOpenAI({ names = cases, dryRun = false, key, fetchImpl = fetch } = {}) {
  if (!names.length || names.some(name => !cases.includes(name))) throw Error("検証ケースが不正です")
  if (!dryRun && (typeof key !== "string" || !key.trim())) throw Error("APIキー未設定")
  const reports = []
  for (const name of names) {
    const gas = driveGas()
    gas.props.set("OPENAI_API_KEY", dryRun ? "dry-run-placeholder" : key.trim())
    gas.run('APP_CONFIG.providers.draft="openai"; APP_CONFIG.providers.photo="drive"')
    const count = name === "G4b_two_images" ? 2 : name === "G4a_one_image" ? 1 : 0
    const ids = Array.from({ length: count }, (_, i) => {
      const result = gas.call("uploadPhoto", { uploadId: "smoke-photo-000" + i, mimeType: "image/png", base64: png })
      if (!result.ok) throw Error("作例の準備失敗")
      return result.data.file_id
    })
    if (name === "G3a_text") gas.run('Settings.diaryPreferences = () => ""')
    let request
    gas.context.UrlFetchApp = { fetch: (url, options) => {
      request = { url, options }
      return { getResponseCode: () => 503, getContentText: () => "" }
    } }
    const input = { requestId: "smoke-capture-" + name, tagIds: ["11", "16"], imageIds: ids, aiConsent: true }
    gas.call("generateDraft", input)
    if (!request) throw Error("検証要求を構築できません")
    if (dryRun) {
      reports.push({ case: name, ok: true, dryRun: true, images: count })
      continue
    }
    const started = Date.now()
    const response = await fetchImpl(request.url, {
      method: "POST", headers: { ...request.options.headers, "Content-Type": "application/json" },
      body: request.options.payload, redirect: "error", signal: AbortSignal.timeout(90000)
    })
    const body = await response.text()
    gas.context.UrlFetchApp = { fetch: () => ({ getResponseCode: () => response.status, getContentText: () => body }) }
    // 捕捉用要求は失敗として記録済み。別IDで実レスポンスの検証・保存経路を通す。
    const result = gas.call("generateDraft", { ...input, requestId: "smoke-result-" + name })
    reports.push({ case: name, ok: result.ok, httpStatus: response.status, elapsedMs: Date.now() - started,
      titleLength: result.data?.title?.length, bodyLength: result.data?.body?.length, errorCode: result.error?.code })
    if (!result.ok) break
  }
  return reports
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2)
    if (args.includes("--help") || args.includes("--list")) {
      if (args.length !== 1) throw Error("引数不正")
      console.log("verify-openai.mjs [--dry-run] [ケース名 ...]\n" + cases.join("\n"))
    } else {
      const dryRun = args.includes("--dry-run")
      const names = args.filter(arg => arg !== "--dry-run")
      if (names.some(name => !cases.includes(name))) throw Error("引数不正")
      const key = dryRun ? undefined : parse(readFileSync(new URL("../../env/secret.yaml", import.meta.url), "utf8"))?.openai?.api_key
      const reports = await verifyOpenAI({ names: names.length ? names : cases, dryRun, key })
      console.log(JSON.stringify(reports, null, 2))
      if (reports.some(report => !report.ok)) process.exitCode = 1
    }
  } catch {
    console.error("検証失敗。引数は --help、キーは env/secret.yaml を確認してください。秘密保護のため例外詳細は出力しません。")
    process.exitCode = 1
  }
}
