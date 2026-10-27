import { test } from "node:test"
import assert from "node:assert/strict"
import { createGas } from "./gas-mock.mjs"

function ready() {
  const g = createGas()
  g.run("Seeder.ensureIfNeeded()")
  return g
}

function addPhotos(g, count) {
  g.context.photoCount = count
  g.run(`withLock_(() => {
    SheetStore.append("assets", Array.from({length:photoCount}, (_,i) => ({
      id:"asset-review-"+i, storage_kind:"drive", storage_key:"drive-file-"+i,
      recovery_key:"apd_review-upload-"+i+"_"+"a".repeat(64)+".jpg", sha256:"a".repeat(64),
      mime_type:"image/jpeg", byte_size:123456, state:"ready", created_at:new Date(), updated_at:new Date()
    })));
    SheetStore.append("posts", Array.from({length:photoCount}, (_,i) => ({
      id:"review-post-"+i, title:"title", body:"body", created_at:new Date()
    })));
    SheetStore.append("post_assets", Array.from({length:photoCount}, (_,i) => ({
      id:"review-link-"+i, post_id:"review-post-"+i, asset_id:"asset-review-"+i, sort_order:1
    })));
  })`)
}

for (const [count, cacheDown] of [[50, false], [300, false], [1000, true]]) {
  test(`一覧：画像${count}件・キャッシュ${cacheDown ? "停止" : "有効"}でも資産表は1回だけ読む`, () => {
    const g = ready()
    addPhotos(g, count)
    if (count >= 300)
      assert.ok(g.run('utf8Bytes_(JSON.stringify(SheetStore.readFresh("assets"),encodeDate_)) > TableCache.MAX_BYTES'))
    g.cache.clear()
    if (cacheDown) g.context.CacheService.getScriptCache = () => { throw Error("cache down") }
    let reads = 0, views = 0
    const sheet = g.sheets.get("v2_assets"), original = sheet.getDataRange
    sheet.getDataRange = (...args) => { reads++; return original(...args) }
    g.context.countView = () => { views++ }
    g.run('const driveView=DrivePhotoProvider.view;DrivePhotoProvider.view=function(...args){countView();return driveView.apply(this,args)}')
    const posts = g.run("DiaryPresenter.list(DiaryService.list().diaries)")
    assert.equal(posts.length, count + 2)
    assert.equal(reads, 1)
    assert.equal(views, count, "代表画像と全画像で重複解決しない")
    for (const post of posts.filter((p) => p.id.startsWith("review-post-"))) {
      assert.deepEqual(post.image, post.images[0])
      assert.equal(post.image.byte_size, 123456)
      assert.equal(post.image.asset_id, post.id.replace("review-post-", "asset-review-"))
      assert.equal(post.image.kind, "drive")
    }
    // 起動時も同じ一括経路を使い、要求をまたいで古い索引を保持しない。
    g.cache.clear()
    reads = 0
    assert.equal(g.run("clientConfig_().initialList.posts.length"), 50)
    assert.equal(reads, 1)
    g.run('withLock_(()=>SheetStore.update("assets","asset-review-0",{byte_size:777}))')
    reads = 0
    assert.equal(g.call("getOne", "review-post-0").data.images[0].byte_size, 777)
    assert.equal(reads, 1)
  })
}

test("起動一覧は50件に限定し、追記が割り込んでもページの既存日記を欠落・重複させない", (t) => {
  const g = ready()
  addPhotos(g, 1000)
  const before = g.call("getAll").data
  assert.equal(before.posts.length, 50)
  assert.equal(before.total, 1002)
  const fullBytes = Buffer.byteLength(JSON.stringify(g.run("DiaryPresenter.list(DiaryService.list().diaries)")))
  const pageBytes = Buffer.byteLength(JSON.stringify(before))
  assert.ok(pageBytes < fullBytes / 10)
  t.diagnostic(JSON.stringify({ fullBytes, pageBytes }))
  assert.equal(g.call("create", {title:"後から追加",body:"本文"}, "paging-new-post").ok, true)
  const ids = before.posts.map(p => p.id)
  let cursor = before.nextCursor
  while (cursor) {
    const page = g.call("getAll", null, cursor)
    assert.equal(page.ok, true)
    assert.ok(page.data.posts.length <= 50)
    ids.push(...page.data.posts.map(p => p.id))
    cursor = page.data.nextCursor
  }
  assert.equal(ids.length, 1002)
  assert.equal(new Set(ids).size, 1002)
  assert.equal(g.call("getAll", null, "unknown").error.code, "invalid_cursor")
  assert.equal(g.call("getAll", "10", before.nextCursor).error.code, "invalid_cursor")
  assert.ok(g.call("getAll", "10").data.posts.every(p => p.tags.some(t => t.id === "10")))
})

test("画像索引：ダミー・旧storage_key・欠損・非readyを区別し、表示順を保持する", () => {
  const g = ready()
  addPhotos(g, 3)
  g.run('withLock_(()=>SheetStore.update("assets","asset-review-1",{state:"trashed"}))')
  const photos = g.run(`DiaryPresenter.detail({id:"probe", title:"title", body:"body", tags:[], photos:[
    {fileId:"drive-file-2",sortOrder:1}, {fileId:"sample-a",sortOrder:2},
    {fileId:"asset-review-1",sortOrder:3}, {fileId:"absent",sortOrder:4}
  ]}).images`)
  assert.deepEqual(Array.from(photos, (p) => p.kind), ["drive", "dummy", "missing", "missing"])
  assert.deepEqual(Array.from(photos, (p) => p.sort_order), [1, 2, 3, 4])
  assert.equal(photos[0].file_id, "asset-review-2")
})

for (const phase of ["before-write", "flush", "after-publish", "cache-put"]) {
  test(`失効競合：${phase}で手動編集しても旧キャッシュを復活させない`, () => {
    const g = ready()
    assert.equal(g.call("getAll").ok, true)
    const oldGeneration = g.run("TableCache.generation()"), oldTags = g.run('SheetStore.read("tags")')
    let edited = false, writing = false
    function edit() {
      if (edited) return
      edited = true
      const sheet = g.sheets.get("v2_tags"), row = sheet.rows.findIndex((r) => r[0] === "10")
      sheet.getRange(row + 1, 2).setValues([["手動編集後"]])
      g.run("onEdit()")
    }
    const properties = g.context.PropertiesService.getScriptProperties
    g.context.PropertiesService.getScriptProperties = () => {
      const props = properties()
      return { ...props, setProperty(key, value) {
        if (key === "DB_CACHE_GENERATION" && value.startsWith("writing:")) {
          writing = true
          if (phase === "before-write") edit()
        }
        props.setProperty(key, value)
        if (phase === "after-publish" && writing && key === "DB_CACHE_GENERATION" && !value.startsWith("writing:")) edit()
      } }
    }
    if (phase === "flush") g.context.SpreadsheetApp.flush = edit
    if (phase === "cache-put") {
      const cache = g.context.CacheService.getScriptCache
      g.context.CacheService.getScriptCache = () => {
        const c = cache()
        return { ...c, putAll(values, ttl) { edit(); c.putAll(values, ttl) } }
      }
    }
    const result = g.call("create", { title:"競合検証", body:"本文" }, "cache-race-1")
    assert.equal(result.ok, true)
    assert.equal(edited, true)
    g.context.oldGeneration = oldGeneration
    g.context.oldTags = oldTags
    g.run("TableCache.putMany({tags:oldTags},oldGeneration)")
    for (let i = 0; i < 2; i++) {
      assert.equal(g.call("getAll").data.tags.find((t) => t.id === "10").name, "手動編集後")
      assert.equal(g.call("create", { title:"後続保存", body:"本文" }, "cache-race-next-" + i).ok, true)
    }
    assert.equal(g.run('SheetStore.readFresh("tags").find(t=>t.id==="10").name'), "手動編集後")
  })
}
