import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { runSteps } from "../scripts/check.mjs"
import { verifyGemini } from "../scripts/verify-gemini.mjs"

test("一括検証は異常終了・起動失敗・シグナルで後続を停止する", () => {
  for (const failure of [{ status: 1 }, { status: null, error: Error("起動失敗") }, { status: 0, signal: "SIGTERM" }]) {
    let calls = 0
    const results = runSteps([["前段", []], ["後段", []]], () => { calls++; return failure })
    assert.equal(calls, 1)
    assert.equal(results[0].ok, false)
  }
})

test("AI dry-runはネットワークなしで画像を含む4要求を構築する", async () => {
  const reports = await verifyGemini({ dryRun: true, fetchImpl: () => assert.fail("外部送信禁止") })
  assert.deepEqual(reports.map(r => r.images), [0, 0, 1, 2])
  assert.ok(reports.every(r => r.ok))
  await assert.rejects(verifyGemini({ names: ["typo"], dryRun: true }))
})

test("AI実レスポンスを別要求IDで検証し、失敗したケースで停止する", async () => {
  let calls = 0
  const reports = await verifyGemini({ key: "test-only", fetchImpl: async () => {
    calls++
    return { status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: "作例", body: "散歩した。" }) }] }, finishReason: "STOP" }] }) }
  } })
  assert.equal(calls, 4)
  assert.ok(reports.every(r => r.ok), JSON.stringify(reports))
  calls = 0
  const failed = await verifyGemini({ key: "test-only", fetchImpl: async () => {
    calls++
    return { status: 429, text: async () => "{}" }
  } })
  assert.equal(calls, 1)
  assert.equal(failed[0].ok, false)
})

test("CLIは別cwdでも動き、不正引数を成功扱いしない", () => {
  for (const [name, args, status] of [
    ["build-data", ["--check"], 0], ["build-data", ["--invalid"], 1],
    ["verify-gemini", ["unknown-case"], 1], ["benchmark-db", ["--counts=0"], 1],
  ]) {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL(`../scripts/${name}.mjs`, import.meta.url)), ...args], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)), encoding: "utf8",
    })
    assert.equal(result.status, status, result.stderr)
  }
})
