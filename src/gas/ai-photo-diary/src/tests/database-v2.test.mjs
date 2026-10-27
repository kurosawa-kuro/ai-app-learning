import { test } from "node:test"
import assert from "node:assert/strict"
import { createGas } from "./gas-mock.mjs"
import { driveGas, png } from "./drive-mock.mjs"

const ok = (r) => {
  assert.equal(r.ok, true, JSON.stringify(r.error))
  return r.data
}
const ready = () => {
  const gas = createGas()
  gas.run("withLock_(() => Seeder.ensure())")
  return gas
}
const rows = (gas, name) => JSON.parse(JSON.stringify(gas.run(`SheetStore.readFresh('${name}')`)))
const upload = (gas, id = "upload-v2-0001") =>
  ok(gas.call("uploadPhoto", { uploadId: id, mimeType: "image/png", base64: png }))

test("v2：保存IDと入力を照合し、タグ順序だけの差は同じ要求にする", () => {
  const gas = ready(),
    data = { title: "A", body: "本文", tagIds: ["11", "10"] }
  const a = ok(gas.call("create", data, "save-v2"))
  gas.cache.clear()
  assert.equal(ok(gas.call("create", { ...data, tagIds: ["10", "11"] }, "save-v2")).id, a.id)
  assert.equal(gas.call("create", { ...data, body: "変更" }, "save-v2").error.code, "request_conflict")
  assert.equal(rows(gas, "posts").length, 3)
  assert.equal(gas.call("create", data).error.code, "invalid")
})

test("v2：親保存後に要求完了更新が失敗しても日記を増やさない", () => {
  const gas = ready(),
    data = { title: "完了窓", body: "本文", imageIds: ["sample-a"] }
  gas.run(
    'globalThis.originalUpdate=RequestRepository.update;RequestRepository.update=()=>{throw new AppError("test","failure")}'
  )
  assert.equal(gas.call("create", data, "commit-window").ok, false)
  gas.run("RequestRepository.update=originalUpdate")
  const a = ok(gas.call("create", data, "commit-window"))
  assert.equal(rows(gas, "post_assets").filter((r) => r.post_id === a.id).length, 1)
  assert.equal(rows(gas, "posts").length, 3)
  assert.equal(rows(gas, "post_create_requests")[0].state, "succeeded")
})

test("v2：未到着要求の中止記録で遅れて届く旧保存も拒否する", () => {
  const gas = ready()
  assert.equal(ok(gas.call("cancelCreate", "late-request")).state, "cancelled")
  assert.equal(gas.call("create", { title: "遅延", body: "本文" }, "late-request").error.code, "request_cancelled")
  assert.equal(rows(gas, "posts").length, 2)
})

test("v2：容量境界・破損JSON・更新前読取の遅延書戻し", () => {
  const gas = ready()
  ok(gas.call("getAll"))
  const generation = gas.run("TableCache.generation()"),
    old = gas.run('SheetStore.read("posts")')
  for (let i = 0; i < 7; i++) ok(gas.call("create", { title: "境界", body: "あ".repeat(5000) }, "size-" + i))
  assert.equal(ok(gas.call("getAll")).posts.length, 9)
  gas.context.oldRows = old
  gas.context.oldGeneration = generation
  gas.run("TableCache.putMany({posts:oldRows},oldGeneration)")
  assert.equal(ok(gas.call("getAll")).posts.length, 9)
  gas.cache.set(gas.run('TableCache.key("posts",TableCache.generation())'), "{broken")
  assert.equal(ok(gas.call("getAll")).posts.length, 9)
})

test("v2：書込中読取が旧内容を新世代へキャッシュしない", () => {
  const gas = ready()
  ok(gas.call("getAll"))
  const sheet = gas.sheets.get("v2_posts"),
    original = sheet.getRange
  sheet.getRange = (...args) => {
    const range = original(...args),
      set = range.setValues
    if (args[0] > 1)
      range.setValues = (values) => {
        assert.equal(gas.run("TableCache.generation()"), null)
        gas.run('SheetStore.read("posts")')
        return set(values)
      }
    return range
  }
  ok(gas.call("create", { title: "競合", body: "本文" }, "race"))
  assert.equal(ok(gas.call("getAll")).posts.length, 3)
})

test("v2：失効の永続化に失敗したらデータ書込より前に停止する", () => {
  const gas = ready(),
    props = gas.context.PropertiesService.getScriptProperties
  gas.context.PropertiesService.getScriptProperties = () => ({
    ...props(),
    setProperty() {
      throw Error("props down")
    },
  })
  assert.equal(gas.call("create", { title: "停止", body: "本文" }, "fail-props").ok, false)
  assert.equal(rows(gas, "posts").length, 2)
  assert.equal(rows(gas, "post_create_requests").length, 0)
})

test("v2：見出し不一致・複合キー重複を拒否する", () => {
  const gas = ready(),
    sheet = gas.sheets.get("v2_posts")
  sheet.getRange(1, 1).setValues([["wrong_id"]])
  assert.equal(gas.call("create", { title: "停止", body: "本文" }, "schema").error.code, "schema_mismatch")
  assert.throws(() => gas.run('SheetStore.append("post_tags",[{post_id:"1",tag_id:"10"}])'), /一意キー/)
})

test("v2：資産作成後・転送完了前に停止しても再送でDriveを増やさない", () => {
  const gas = driveGas()
  gas.run('globalThis.saved=AssetRepository.update;AssetRepository.update=()=>{throw new AppError("test","failure")}')
  assert.equal(gas.call("uploadPhoto", { uploadId: "upload-v2-fail", mimeType: "image/png", base64: png }).ok, false)
  assert.equal(gas.files.size, 1)
  gas.run("AssetRepository.update=saved")
  const a = upload(gas, "upload-v2-fail")
  assert.match(a.asset_id, /^asset-/)
  assert.equal(gas.files.size, 1)
  gas.run('SheetStore.removeWhere("upload_requests","upload_id","upload-v2-fail")')
  assert.equal(ok(gas.call("getPhoto", a.asset_id)).base64, png)
})

test("v2：AI成功応答を再取得し、採用元と利用量を保存する", () => {
  const gas = ready()
  gas.run(
    'APP_CONFIG.providers.draft="gemini";globalThis.calls=0;GeminiClient.generateText=()=>{calls++;return {ok:true,text:JSON.stringify({title:"AI",body:"生成文"}),usage:{totalTokenCount:42},elapsedMs:12}}'
  )
  const input = { requestId: "ai-v2", tagIds: ["11"], aiConsent: true }
  const a = ok(gas.call("generateDraft", input)),
    b = ok(gas.call("generateDraft", input))
  assert.equal(a.generationId, b.generationId)
  assert.equal(gas.run("calls"), 1)
  assert.equal(JSON.parse(rows(gas, "ai_generations")[0].usage_json).totalTokenCount, 42)
  assert.equal(gas.call("generateDraft", { ...input, tagIds: ["10"] }).error.code, "request_conflict")
  const post = ok(
    gas.call("create", { title: a.title, body: "人の編集", sourceGenerationId: a.generationId }, "ai-save")
  )
  assert.equal(post.source_generation_id, a.generationId)
  assert.equal(rows(gas, "ai_generations")[0].output_body, "生成文")
})

test("v2：AI応答後の保存失敗は再送しても外部呼出しない", () => {
  const gas = ready()
  gas.run(
    'globalThis.calls=0;MockDraftProvider.generate=()=>{calls++;return {title:"AI",body:"本文",mock:true}};globalThis.gu=GenerationRepository.update;GenerationRepository.update=(id,v)=>{if(v.state==="succeeded")throw new AppError("test","failure");return gu(id,v)}'
  )
  const input = { requestId: "ai-window", tagIds: ["11"] }
  assert.equal(gas.call("generateDraft", input).ok, false)
  gas.run("GenerationRepository.update=gu")
  assert.equal(gas.call("generateDraft", input).error.code, "generation_pending")
  assert.equal(gas.run("calls"), 1)
})

test("v2：実行中AIの画像は整理できず、終了後は候補に戻る", () => {
  const gas = driveGas(),
    a = upload(gas)
  gas.run(`AssetRepository.update('${a.asset_id}',{created_at:new Date(Date.now()-48*3600000)})`)
  gas.run(
    'MockDraftProvider.generate=()=>{globalThis.during=UploadMaintenance.candidates();return {title:"AI",body:"本文",mock:true}}'
  )
  ok(gas.call("generateDraft", { requestId: "ai-protect", imageIds: [a.asset_id] }))
  assert.equal(gas.run("during.length"), 0)
  assert.equal(ok(gas.call("listOrphanUploads")).length, 1)
})

test("v2：ゴミ箱移動後の状態更新失敗は再送で回復する", () => {
  const gas = driveGas(),
    a = upload(gas)
  gas.run(`AssetRepository.update('${a.asset_id}',{created_at:new Date(Date.now()-48*3600000)})`)
  gas.run(
    'globalThis.au=AssetRepository.update;AssetRepository.update=(id,v)=>{if(v.state==="trashed")throw new AppError("test","failure");return au(id,v)}'
  )
  assert.equal(gas.call("trashOrphanUpload", a.asset_id).ok, false)
  assert.equal(rows(gas, "assets").find((r) => r.id === a.asset_id).state, "trash_pending")
  gas.run("AssetRepository.update=au")
  assert.equal(ok(gas.call("trashOrphanUpload", a.asset_id)).trashed, true)
})

test("v2：30日後の手動整理で生成内容だけ消え、日記と由来は残る", () => {
  const gas = ready(),
    a = ok(gas.call("generateDraft", { requestId: "ai-clean", tagIds: ["11"] }))
  const post = ok(gas.call("create", { title: a.title, body: a.body, sourceGenerationId: a.generationId }, "keep-post"))
  assert.equal(gas.call("purgeGenerationHistory", a.generationId).ok, false)
  gas.run(`GenerationRepository.update('${a.generationId}',{created_at:new Date(Date.now()-31*86400000)})`)
  assert.equal(ok(gas.call("listGenerationHistoryForCleanup")).length, 1)
  ok(gas.call("purgeGenerationHistory", a.generationId))
  assert.equal(rows(gas, "ai_generations")[0].input_snapshot_json, "")
  assert.equal(rows(gas, "ai_generations")[0].output_body, "")
  assert.equal(ok(gas.call("getOne", post.id)).body, a.body)
  assert.equal(ok(gas.call("getOne", post.id)).source_generation_id, a.generationId)
})

function legacyGas(count = 1) {
  const gas = createGas()
  const headers = gas.run("LEGACY_TABLES")
  for (const [name, columns] of Object.entries(headers)) {
    const sheet = gas.context.SpreadsheetApp.getActiveSpreadsheet().insertSheet(name)
    sheet.getRange(1, 1, 1, columns.length).setValues([columns])
  }
  for (let i = 0; i < count; i++)
    gas.sheets
      .get("posts")
      .getRange(i + 2, 1, 1, 4)
      .setNumberFormat("@")
      .setValues([[String(i + 1), "旧日記", "旧本文", new Date(1000 + i)]])
  gas.sheets
    .get("tags")
    .getRange(2, 1, 1, 2)
    .setNumberFormat("@")
    .setValues([["10", "旧タグ"]])
  gas.sheets
    .get("images")
    .getRange(2, 1, 1, 4)
    .setNumberFormat("@")
    .setValues([["old-img", "1", "sample-a", 1]])
  gas.sheets
    .get("post_tags")
    .getRange(2, 1, 1, 2)
    .setNumberFormat("@")
    .setValues([["1", "10"]])
  gas.sheets
    .get("requests")
    .getRange(2, 1, 2, 2)
    .setNumberFormat("@")
    .setValues([
      ["old-request", "1"],
      ["pending-request", "uncommitted"],
    ])
  return gas
}

test("v2：旧表は通常起動で変換せず、監査→分割移行→切替する", () => {
  const gas = legacyGas(510),
    before = JSON.stringify(gas.sheets.get("posts").rows)
  assert.equal(gas.call("getAll").error.code, "migration_required")
  assert.equal(gas.run("DatabaseMigration.audit().ok"), true)
  assert.equal(gas.run("DatabaseMigration.apply().state"), "running")
  assert.equal(gas.props.get("DB_SCHEMA_VERSION"), undefined)
  assert.equal(gas.run("DatabaseMigration.apply().state"), "verified")
  gas.run("DatabaseMigration.activate()")
  assert.equal(ok(gas.call("getAll")).total, 510)
  assert.equal(ok(gas.call("getAll")).posts.length, 50)
  assert.equal(JSON.stringify(gas.sheets.get("posts").rows), before)
  assert.equal(ok(gas.call("create", { title: "互換", body: "任意" }, "old-request")).id, "1")
  assert.equal(gas.call("create", { title: "不可", body: "任意" }, "pending-request").error.code, "recovery_required")
})

test("v2：移行中の元データ変更と見出し不一致は上書きせず停止", () => {
  const gas = legacyGas()
  gas.run("DatabaseMigration.apply()")
  gas.sheets
    .get("posts")
    .getRange(2, 2)
    .setValues([["changed"]])
  assert.throws(() => gas.run("DatabaseMigration.activate()"), /再監査/)
  assert.throws(() => gas.run("DatabaseMigration.apply()"), /変更/)
  assert.equal(gas.props.get("DB_SCHEMA_VERSION"), undefined)
})

test("v2：初期データ投入中の障害は明示的再開で重複させない", () => {
  const gas = createGas()
  gas.run(
    'globalThis.sa=SheetStore.append;SheetStore.append=(n,r)=>{if(n==="posts")throw new AppError("test","failure");return sa(n,r)}'
  )
  assert.equal(gas.call("getAll").ok, false)
  gas.run("SheetStore.append=sa")
  assert.equal(gas.call("getAll").error.code, "migration_required")
  gas.run("withLock_(()=>Seeder.initialize())")
  assert.equal(ok(gas.call("getAll")).posts.length, 2)
  assert.equal(rows(gas, "post_assets").length, 3)
})

test("v2：旧Drive名を保持し、画像照合後に切替、pending転送も再開する", () => {
  const drive = driveGas(),
    image = upload(drive, "legacy-image-0001")
  const asset = rows(drive, "assets").find((r) => r.id === image.asset_id)
  const gas = legacyGas()
  gas.context.DriveApp = drive.context.DriveApp
  gas.context.Session.getEffectiveUser = drive.context.Session.getEffectiveUser
  Object.assign(gas.context.Utilities, {
    base64Decode: drive.context.Utilities.base64Decode,
    base64Encode: drive.context.Utilities.base64Encode,
    newBlob: drive.context.Utilities.newBlob,
  })
  gas.props.set("PHOTO_FOLDER_ID", "folder")
  gas.sheets
    .get("uploads")
    .getRange(2, 1, 2, 7)
    .setNumberFormat("@")
    .setValues([
      ["legacy-image-0001", asset.storage_key, asset.sha256, asset.mime_type, asset.byte_size, new Date(), "ready"],
      ["legacy-pending-0002", "", asset.sha256, asset.mime_type, asset.byte_size, new Date(), "pending"],
    ])
  gas.sheets
    .get("images")
    .getRange(2, 3)
    .setValues([[asset.storage_key]])
  const oldName = drive.files.get(asset.storage_key).getName()
  gas.run("DatabaseMigration.apply()")
  assert.throws(() => gas.run("DatabaseMigration.activate()"), /読取検証/)
  assert.equal(gas.run("DatabaseMigration.verifyFiles().verifiedFiles"), 1)
  gas.run("DatabaseMigration.activate()")
  const post = ok(gas.call("getOne", "1"))
  assert.equal(ok(gas.call("getPhoto", post.images[0].asset_id)).base64, png)
  assert.equal(drive.files.get(asset.storage_key).getName(), oldName)
  const resumed = upload(gas, "legacy-pending-0002")
  assert.equal(resumed.asset_id, "legacy-upload-legacy-pending-0002")
  assert.equal(drive.files.size, 2)
})

test("v2：整理済みの失敗生成を日記の採用元として登録しない", () => {
  const gas = ready()
  gas.run('MockDraftProvider.generate=()=>{throw new AppError("invalid_draft","failure")}')
  gas.call("generateDraft", { requestId: "failed-source", tagIds: ["11"] })
  const id = rows(gas, "ai_generations")[0].id
  gas.run(`GenerationRepository.update('${id}',{created_at:new Date(Date.now()-31*86400000)})`)
  ok(gas.call("purgeGenerationHistory", id))
  assert.equal(
    gas.call("create", { title: "日記", body: "本文", sourceGenerationId: id }, "bad-source").error.code,
    "invalid"
  )
})
