import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import vm from "node:vm"

// GAS模擬環境・生成設定・Repositoryを読み込まず、内側の層だけを実行する。
function inner() {
  const base = new URL("../server/", import.meta.url)
  const context = vm.createContext({ Date, Map, Set, JSON })
  for (const file of [
    "core/errors.js",
    ...readdirSync(new URL("domain/", base))
      .sort()
      .map((n) => "domain/" + n),
    ...readdirSync(new URL("application/", base))
      .sort()
      .map((n) => "application/" + n),
  ]) {
    vm.runInContext(readFileSync(new URL(file, base), "utf8"), context, { filename: file })
  }
  return vm.runInContext(
    "({ DiaryPolicy, AssetPolicy, GenerationPolicy, createDiaryApplication_, createUploadApplication_, createGenerationApplication_ })",
    context
  )
}

test("Domain：本文の正規化と文字数境界は設定・DBなしで検証できる", () => {
  const { DiaryPolicy: policy } = inner()
  const limits = { title: 2, body: 3 }
  assert.equal(policy.text({ title: " 題 ", body: " 本文 " }, limits).body, " 本文")
  for (const input of [
    { title: "", body: "文" },
    { title: "題", body: " " },
    { title: "長い題", body: "文" },
    { title: "題", body: "長い本文" },
  ]) {
    assert.throws(
      () => policy.text(input, limits),
      (e) => e.code === "invalid"
    )
  }
})

test("Domain：生成状態ごとの整理・採用・中止を境界時刻で検証する", () => {
  const { GenerationPolicy: policy } = inner(),
    date = new Date(0)
  for (const state of ["pending", "running", "unknown", "succeeded", "failed", "succeeded_purged", "failed_purged"]) {
    assert.equal(policy.canPurge(state, date, 30 * 86400000), false)
    assert.equal(policy.canPurge(state, date, 30 * 86400000 + 1), ["succeeded", "failed"].includes(state))
    assert.equal(policy.canAdopt(state), ["succeeded", "succeeded_purged"].includes(state))
    assert.equal(policy.canAbandon(state, date, 15 * 60000 - 1), false)
    assert.equal(policy.canAbandon(state, date, 15 * 60000), ["pending", "running", "unknown"].includes(state))
  }
  assert.equal(policy.isInterrupted("running", date, 15 * 60000), false)
  assert.equal(policy.isInterrupted("running", date, 15 * 60000 + 1), true)
})

test("Domain：画像の整理には保持期限・非参照・保存状態がすべて必要", () => {
  const { AssetPolicy: policy } = inner()
  const asset = { storageKind: "drive", state: "ready", referenced: false, createdAt: new Date(0) }
  const now = 3600001
  assert.equal(policy.canTrash(asset, now, 1), true)
  for (const patch of [
    { storageKind: "dummy" },
    { referenced: true },
    { state: "pending" },
    { state: "trashed" },
    { createdAt: new Date(1) },
  ]) {
    assert.equal(policy.canTrash({ ...asset, ...patch }, now, 1), false)
  }
  assert.equal(policy.canTrash({ ...asset, state: "trash_pending" }, now, 1), true)
  assert.doesNotThrow(() => policy.validateTotalBytes(100, 100))
  assert.throws(
    () => policy.validateTotalBytes(101, 100),
    (e) => e.code === "invalid_image"
  )
})

test("Application：注入した保存先だけで保存・再送し、親を二重作成しない", () => {
  const { createDiaryApplication_: create } = inner()
  const posts = [],
    requests = new Map(),
    events = []
  let locked = false
  const app = create({
    database: { ensure() {} },
    lock(fn) {
      assert.equal(locked, false)
      locked = true
      try {
        return fn()
      } finally {
        locked = false
      }
    },
    hash: JSON.stringify,
    clock: { date: () => new Date(123) },
    photos: { assetId: (id) => id, validateAttachment() {} },
    validation: { forCreate: (d) => ({ ...d, photoIds: d.imageIds }) },
    tags: { fresh: () => [] },
    requests: {
      find: (id) => requests.get(id),
      reserve(id, postId, hash) {
        assert.ok(locked)
        requests.set(id, { post_id: postId, payload_hash: hash, state: "pending" })
        events.push("reserve")
      },
      update(id, patch) {
        Object.assign(requests.get(id), patch)
        events.push("complete")
      },
    },
    diaries: {
      newId: () => "post-1",
      findById: (id) => posts.find((p) => p.id === id),
      insert(post) {
        assert.ok(locked)
        posts.push(post)
        events.push("insert")
      },
    },
  })
  const input = { title: "日記", body: "本文" }
  assert.equal(app.create(input, "request-1").id, "post-1")
  assert.equal(app.create(input, "request-1").id, "post-1")
  assert.equal(posts.length, 1)
  assert.deepEqual(events, ["reserve", "insert", "complete"])
  assert.equal(posts[0].createdAt.getTime(), 123)
  assert.throws(
    () => app.create({ ...input, body: "変更" }, "request-1"),
    (e) => e.code === "request_conflict"
  )
  assert.equal(locked, false)
})

test("Application：保存済みAI応答は提供元や時計に依存せず再取得できる", () => {
  const { createGenerationApplication_: create } = inner()
  const input = { requestId: "cached", tagIds: ["11"], aiConsent: true }
  const expected = { title: "生成済み", body: "本文", generationId: "g1" }
  const app = create({
    database: { ensure() {} },
    lock: (fn) => fn(),
    hash: () => "same",
    generations: { findRequest: () => ({ state: "succeeded", input_hash: "same" }), result: () => expected },
  })
  assert.equal(app.generate(input), expected)
})

test("Application：画像読取は注入した保管先を使い、非ready資産を渡さない", () => {
  const { createUploadApplication_: create } = inner()
  let reads = 0
  const asset = { id: "asset-1", storage_kind: "drive", state: "ready" }
  const app = create({
    assets: { resolve: () => asset },
    storage: {
      read(value) {
        assert.equal(value, asset)
        reads++
        return { base64: "fixture" }
      },
    },
  })
  assert.equal(app.read("asset-1").base64, "fixture")
  asset.state = "trashed"
  assert.throws(
    () => app.read("asset-1"),
    (e) => e.code === "not_found"
  )
  assert.equal(reads, 1)
})
