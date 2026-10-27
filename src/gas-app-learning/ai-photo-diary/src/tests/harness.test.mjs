import { test } from "node:test"
import assert from "node:assert/strict"
import { createGas } from "./gas-mock.mjs"

test("模擬時刻はDateとDate.nowで一致し、別環境へ漏れない", () => {
  const a = createGas({ now: 0 }), b = createGas({ now: 100 })
  assert.equal(a.run("new Date().getTime()"), 0)
  a.clock.advance(1000)
  assert.equal(a.run("Date.now()"), 1000)
  assert.equal(a.run("new Date(123).getTime()"), 123)
  assert.equal(a.run("new Date() instanceof Date"), true)
  assert.equal(b.run("Date.now()"), 100)
})

test("模擬キャッシュはUTF-8容量と各項目のTTLを検証する", () => {
  const gas = createGas({ now: 0 }), cache = gas.context.CacheService.getScriptCache()
  cache.put("short", "1", 1)
  cache.putAll({ long: "2" }, 2)
  assert.throws(() => cache.put("large", "あ".repeat(40000)), /large/)
  gas.clock.advance(1000)
  assert.equal(cache.get("short"), null)
  assert.deepEqual(cache.getAll(["short", "long"]), { long: "2" })
  gas.clock.advance(1000)
  assert.equal(cache.get("long"), null)
})

test("模擬ロックは競合と所有者を区別し、再取得できる", () => {
  const gas = createGas()
  const a = gas.context.LockService.getScriptLock(), b = gas.context.LockService.getScriptLock()
  assert.equal(a.tryLock(), true)
  assert.equal(b.tryLock(), false)
  b.releaseLock()
  assert.equal(gas.lock.held, true)
  a.releaseLock()
  assert.equal(b.tryLock(), true)
  b.releaseLock()
  assert.equal(gas.lock.held, false)
})
