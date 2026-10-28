// ローカル検証専用。push / deploy / 実API呼出は行わない。
import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { join } from "node:path"
export const srcDir = fileURLToPath(new URL("../", import.meta.url))

export function runSteps(steps, run = args => spawnSync(process.execPath, args, { cwd: srcDir, stdio: "inherit", shell: false })) {
  const results = []
  for (const [name, args] of steps) {
    console.log("\n確認: " + name)
    const started = Date.now()
    const result = run(args)
    const ok = !result.error && !result.signal && result.status === 0
    results.push({ name, ok, elapsedMs: Date.now() - started, exitCode: result.status ?? null })
    if (!ok) break
  }
  return results
}

export function doctor() {
  if (Number(process.versions.node.split(".")[0]) < 20) throw Error("Node.js 20以上が必要です")
  for (const name of ["yaml", "jsdom", "@google/clasp", "@playwright/test"]) {
    readFileSync(join(srcDir, "node_modules", name, "package.json"), "utf8")
  }
  const manifest = JSON.parse(readFileSync(join(srcDir, "appsscript.json"), "utf8"))
  if (manifest.timeZone !== "Asia/Tokyo" || manifest.runtimeVersion !== "V8" || manifest.webapp?.access !== "MYSELF" ||
      manifest.webapp?.executeAs !== "USER_DEPLOYING") throw Error("GASの実行・公開設定が想定と違います")
  console.log("Node・依存関係・GAS公開設定: OK（認証・実環境の疎通は未検証）")
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let results = []
  let ok = false
  try {
    const args = process.argv.slice(2)
    if (args.length > 1 || args.some(arg => !["--doctor", "--browser", "--help"].includes(arg))) throw Error("引数不正")
    if (args.includes("--help")) {
      console.log("check.mjs [--doctor|--browser] : 既定は設定差分・全単体テスト・AI要求構築。--browser は画面テストも追加")
      process.exit(0)
    }
    doctor()
    const steps = [["生成物の一致", ["scripts/build-data.mjs", "--check"]]]
    if (!args.includes("--doctor")) {
      steps.push(["単体テスト", ["--test", ...readdirSync(join(srcDir, "tests")).filter(name => name.endsWith(".test.mjs")).sort().map(name => "tests/" + name)]])
      steps.push(["AI要求構築（外部送信なし）", ["scripts/verify-openai.mjs", "--dry-run"]])
      if (args.includes("--browser")) {
        steps.push(["ブラウザ受入", ["tests/browser/acceptance.mjs"]], ["画像読込", ["tests/browser/photo-loading.mjs"]])
      }
    }
    results = runSteps(steps)
    ok = results.length === steps.length && results.every(result => result.ok)
  } catch {
    console.error("検証の準備に失敗しました。Node・npm install・appsscript.json・--help を確認してください。")
  }
  mkdirSync(join(srcDir, "test-results"), { recursive: true })
  writeFileSync(join(srcDir, "test-results/local-check.json"), JSON.stringify({
    checkedAt: new Date().toISOString(), environment: "local; not GAS", ok, results
  }, null, 2) + "\n")
  if (!ok) process.exitCode = 1
}
