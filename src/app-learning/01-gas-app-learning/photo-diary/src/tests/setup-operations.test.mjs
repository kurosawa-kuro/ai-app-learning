import { test } from "node:test"
import assert from "node:assert/strict"
import { createGas } from "./gas-mock.mjs"
import { driveGas, png } from "./drive-mock.mjs"

const ready = () => {
  const gas = createGas()
  gas.run("withLock_(()=>Seeder.ensure())")
  return gas
}
// エディタ入口は値を返さないため、google.script.run模擬のJSON変換を通さない。
function editor(gas, fn) {
  const logs = []
  gas.context.console.log = (value) => logs.push(JSON.parse(value))
  assert.equal(gas.run(fn + "()"), undefined)
  assert.equal(logs.length, 1)
  return logs[0]
}

test("運用診断：空環境では初期化せず次の操作を案内する", () => {
  const gas = createGas()
  const beforeProps = [...gas.props]
  const guide = editor(gas, "showSetupGuide")
  assert.ok(guide.performance.checkPerformance)
  const report = editor(gas, "inspectApplicationSetup")
  assert.equal(report.database.state, "empty")
  assert.deepEqual(report.database.next, ["initializeDatabaseV2"])
  assert.equal(report.readyForVerification, false)
  assert.equal(gas.sheets.size, 0)
  assert.deepEqual([...gas.props], beforeProps)
})

test("運用診断：旧表・移行途中・有効後の欠損を区別する", () => {
  const legacy = createGas({ existingSheets: ["posts"] })
  assert.equal(editor(legacy, "inspectDatabaseV2").state, "migration_required")
  const gas = ready()
  assert.equal(editor(gas, "inspectDatabaseV2").state, "ready")
  gas.sheets.delete("v2_posts")
  assert.equal(editor(gas, "inspectDatabaseV2").state, "repair_required")
  assert.equal(gas.sheets.has("v2_posts"), false)
})

test("性能計測：未移行環境ではデータ作成せず失敗する", () => {
  const gas = createGas(),
    logs = []
  gas.context.console.log = (v) => logs.push(JSON.parse(v))
  assert.throws(() => gas.run("checkPerformance()"), /setup_required/)
  assert.equal(logs[0].code, "setup_required")
  assert.equal(gas.sheets.size, 0)
})

test("性能計測：全表件数・一覧サイズ・キャッシュを記録し本文は出さない", () => {
  const gas = ready()
  gas.call("create", { title: "secret-title", body: "secret-diary-body" }, "perf-source")
  const before = JSON.stringify([...gas.sheets].map(([n, s]) => [n, s.rows]))
  const report = editor(gas, "checkPerformance")
  assert.equal(report.database.complete, true)
  assert.equal(report.database.tableCount, 10)
  assert.equal(report.database.tables.find((t) => t.name === "posts").rows, 3)
  assert.equal(report.list.completedSamples, 3)
  assert.ok(report.list.samples.every((s) => s.rows === 3 && s.payloadBytes > 0 && s.serverMs >= 0))
  assert.ok(report.list.samples[1].cacheBefore.tablesPresent.includes("posts"))
  assert.equal(JSON.stringify(report).includes("secret-diary-body"), false)
  assert.equal(JSON.stringify(report).includes("secret-title"), false)
  assert.equal(JSON.stringify([...gas.sheets].map(([n, s]) => [n, s.rows])), before)
})

test("性能計測：coldだけが明示的にキャッシュ世代を更新する", () => {
  const gas = ready()
  gas.call("getAll")
  const generation = gas.props.get("DB_CACHE_GENERATION")
  editor(gas, "checkListPerformance")
  assert.equal(gas.props.get("DB_CACHE_GENERATION"), generation)
  const report = editor(gas, "checkColdListPerformance")
  assert.notEqual(gas.props.get("DB_CACHE_GENERATION"), generation)
  assert.deepEqual(report.samples[0].cacheBefore.tablesPresent, [])
  assert.equal(report.cacheInvalidated, true)
})

test("性能計測：Drive最大3件、取得失敗を個別記録しバイト列を出さない", () => {
  const gas = driveGas()
  for (let i = 0; i < 4; i++)
    assert.equal(
      gas.call("uploadPhoto", { uploadId: "perf-image-000" + i, mimeType: "image/png", base64: png }).ok,
      true
    )
  const before = gas.files.size
  gas.files.get("drive-2").getBlob = () => {
    throw new Error("secret-provider-error")
  }
  const report = editor(gas, "checkPhotoPerformance")
  assert.equal(report.availableImages, 4)
  assert.equal(report.completedSamples, 3)
  assert.equal(report.samples.filter((r) => r.ok).length, 2)
  assert.equal(report.samples[1].code, "image_read_failed")
  assert.equal(JSON.stringify(report).includes(png), false)
  assert.equal(JSON.stringify(report).includes("secret-provider-error"), false)
  assert.equal(gas.files.size, before)
})

test("運用診断：未完了保存の親有無と候補を確認するだけで中止・整理しない", () => {
  const gas = ready()
  gas.run('RequestRepository.reserve("pending-a","ghost","hash");RequestRepository.reserve("pending-b","1","hash")')
  const report = editor(gas, "inspectPendingSaves")
  assert.equal(report.total, 2)
  assert.deepEqual(
    report.items.map((r) => r.parentExists),
    [false, true]
  )
  assert.equal(editor(gas, "inspectCleanupCandidates").deleted, false)
  assert.equal(gas.run('RequestRepository.find("pending-a").state'), "pending")
})

test("運用入口：予期しない例外の内容を漏らさず失敗として終了する", () => {
  const gas = ready(),
    logs = []
  gas.context.console.log = (v) => logs.push(v)
  gas.run('PerformanceService.list=()=>{throw new Error("secret-provider-details")}')
  assert.throws(() => gas.run("checkListPerformance()"), /setup_failed/)
  assert.equal(logs.join().includes("secret-provider-details"), false)
  assert.equal(JSON.parse(logs[0]).ok, false)
})
