import { test } from "node:test"
import assert from "node:assert/strict"
import { driveGas, png } from "./drive-mock.mjs"
const input = (id = "upload-0001") => ({ uploadId: id, mimeType: "image/png", base64: png })

test("P2b：1枚添付→保存→再取得と既存ダミーを両立する", () => {
  const gas = driveGas()
  gas.run('APP_CONFIG.providers.photo = "drive"')
  const id = gas.call("uploadPhoto", input()).data.file_id
  const post = gas.call("create", { title: "写真日記", body: "作例", imageIds: [id] }, "photo-post-1")
  assert.equal(post.ok, true)
  gas.cache.clear()
  assert.equal(gas.call("getOne", post.data.id).data.images[0].file_id, id)
  assert.equal(gas.call("getPhoto", id).data.base64, png)
  assert.equal(gas.call("getOne", "1").data.images[0].kind, "dummy")
  assert.equal(gas.call("create", { title: "拒否", body: "任意", imageIds: ["foreign"] }, "bad-post").ok, false)
})

test("P2a：非公開フォルダへ1枚保存し、再送しても増やさない", () => {
  const gas = driveGas()
  const first = gas.call("uploadPhoto", input())
  assert.equal(first.ok, true)
  assert.equal(gas.call("uploadPhoto", input()).data.file_id, first.data.file_id)
  assert.equal(gas.files.size, 1)
  assert.equal(gas.call("getPhoto", first.data.file_id).data.base64, png)
})
test("P2a：台帳更新失敗後の再送で作成済みファイルを回復", () => {
  const gas = driveGas()
  gas.run('globalThis.updateOriginal = UploadRepository.update; UploadRepository.update = () => { throw new AppError("test", "失敗") }')
  assert.equal(gas.call("uploadPhoto", input()).ok, false)
  assert.equal(gas.files.size, 1)
  gas.run("UploadRepository.update = updateOriginal")
  assert.equal(gas.call("uploadPhoto", input()).ok, true)
  assert.equal(gas.files.size, 1)
})
test("P2a：動画・偽装・容量超過・共有先・任意IDを拒否", () => {
  const gas = driveGas()
  for (const patch of [{ mimeType: "video/mp4" }, { base64: "AAAA" }, { base64: "A".repeat(1400000) }, { mimeType: "image/jpeg" }, { uploadId: "../bad" }]) {
    assert.equal(gas.call("uploadPhoto", { ...input(), ...patch }).ok, false)
  }
  gas.folder.getSharingAccess = () => "ANYONE"
  assert.equal(gas.call("uploadPhoto", input()).ok, false)
  assert.equal(gas.files.size, 0)
  assert.equal(gas.call("getPhoto", "outside-folder").ok, false)
})

test("P3：複数枚の順序・再送・再読込・上限を検証する", () => {
  const gas = driveGas()
  gas.run('APP_CONFIG.providers.photo = "drive"')
  const ids = [1, 2, 3].map((n) => gas.call("uploadPhoto", input(`upload-000${n}`)).data.file_id)
  assert.equal(gas.call("uploadPhoto", input("upload-0002")).data.file_id, ids[1])
  const order = [ids[2], ids[0], ids[1]]
  const saved = gas.call("create", { title: "三枚", body: "順番", imageIds: order }, "multiple-request")
  assert.equal(saved.ok, true)
  gas.cache.clear()
  assert.deepEqual(gas.call("getOne", saved.data.id).data.images.map((i) => i.file_id), order)
  assert.equal(gas.call("create", { title: "超過", body: "拒否", imageIds: [...order, "sample-a"] }, "limit-request").ok, false)
})

test("P2b：親保存失敗から再送しても子の重複を残さず、キャッシュ消失でも二重保存しない", () => {
  const gas = driveGas()
  gas.run('APP_CONFIG.providers.photo="drive"')
  const id = gas.call("uploadPhoto", input()).data.file_id
  gas.run('globalThis.appendOriginal=SheetStore.append; SheetStore.append=(name,rows)=>{if(name==="posts") throw new AppError("test","失敗"); appendOriginal.call(SheetStore,name,rows)}')
  const data = { title: "再試行", body: "画像保持", imageIds: [id], tagIds: ["11"] }
  assert.equal(gas.call("create", data, "retry-save").ok, false)
  gas.run("SheetStore.append=appendOriginal")
  const saved = gas.call("create", data, "retry-save")
  assert.equal(saved.ok, true)
  gas.cache.clear()
  assert.equal(gas.call("create", data, "retry-save").data.id, saved.data.id)
  assert.equal(gas.call("getOne", saved.data.id).data.images.length, 1)
  assert.equal(gas.call("getAll").data.posts.length, 3)
})

test("P4：保存直後・参照中を除外し、候補表示後の参照も再確認する", () => {
  const gas = driveGas()
  gas.run('APP_CONFIG.providers.photo = "drive"')
  const a = gas.call("uploadPhoto", input()).data.file_id
  const b = gas.call("uploadPhoto", input("upload-0002")).data.file_id
  assert.equal(gas.call("listOrphanUploads").data.length, 0)
  gas.run('AssetRepository.update(UploadRepository.find("upload-0001").asset_id, {created_at: new Date(Date.now()-48*3600000)}); AssetRepository.update(UploadRepository.find("upload-0002").asset_id, {created_at: new Date(Date.now()-48*3600000)})')
  assert.equal(gas.call("listOrphanUploads").data.length, 2)
  gas.call("create", { title: "添付済み", body: "保護", imageIds: [a] }, "protect-request")
  assert.equal(gas.call("trashOrphanUpload", "upload-0001").ok, false)
  assert.equal(gas.files.get(gas.run(`AssetRepository.find("${a}",true).storage_key`)).isTrashed(), false)
  assert.equal(gas.call("trashOrphanUpload", "upload-0002").ok, true)
  assert.equal(gas.files.get(gas.run(`AssetRepository.find("${b}",true).storage_key`)).isTrashed(), true)
  assert.equal(gas.call("getPhoto", b).ok, false)
})
