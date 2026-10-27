// 模擬Sheetsの計算量とキャッシュ経路を測る。実GASの通信速度とは区別する。
import { performance } from "node:perf_hooks"
import { mkdirSync, writeFileSync } from "node:fs"
import { createGas } from "../tests/gas-mock.mjs"

const args = process.argv.slice(2)
if (args.length === 1 && args[0] === "--help") {
  console.log("benchmark-db.mjs [--counts=100,1000,10000] : 模擬DBの計測（各件数2〜10000）")
  process.exit(0)
}
if (args.length > 1 || (args.length && !/^--counts=\d+(,\d+)*$/.test(args[0]))) {
  console.error("引数不正。--help を確認してください")
  process.exit(1)
}
const counts = args.length ? args[0].slice(9).split(",").map(Number) : [100, 1000, 10000]
if (counts.length > 10 || counts.some(n => n < 2 || n > 10000)) {
  console.error("件数は2〜10000、指定数は10個以内にしてください")
  process.exit(1)
}
const results = []
for (const count of counts) {
  const gas = createGas()
  gas.run("withLock_(() => Seeder.ensure())")
  gas.context.benchmarkCount = count
  gas.run(
    'SheetStore.append("posts",Array.from({length:benchmarkCount-2},(_,i)=>({id:"bench-"+i,title:"計測",body:"作例".repeat(100),created_at:new Date(1000+i)})))'
  )
  let reads = 0
  for (const sheet of gas.sheets.values()) {
    const original = sheet.getDataRange
    sheet.getDataRange = (...args) => {
      reads++
      return original(...args)
    }
  }
  gas.run("TableCache.clear()")
  const started = performance.now()
  const cold = gas.call("getAll")
  const coldMs = Math.round(performance.now() - started),
    coldReads = reads
  reads = 0
  const warmStarted = performance.now()
  const warm = gas.call("getAll")
  if (!cold.ok || !warm.ok || cold.data.posts.length !== count || warm.data.posts.length !== count) throw new Error("一覧の件数が一致しません")
  results.push({
    count,
    coldMs,
    warmMs: Math.round(performance.now() - warmStarted),
    coldReads,
    warmReads: reads,
    postsCached: gas.run('Boolean(TableCache.getMany(["posts"]).posts)'),
  })
}
mkdirSync(new URL("../test-results/", import.meta.url), { recursive: true })
writeFileSync(
  new URL("../test-results/db-refactor-benchmark.json", import.meta.url),
  JSON.stringify({ checkedAt: new Date().toISOString(), environment: "Node mock; not GAS latency", results }, null, 2)
)
console.log(JSON.stringify(results, null, 2))
