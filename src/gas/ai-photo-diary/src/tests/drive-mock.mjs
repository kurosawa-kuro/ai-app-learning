import { createHash } from "node:crypto"
import { createGas } from "./gas-mock.mjs"

export const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII="
export function driveGas(options) {
  const gas = createGas(options), files = new Map(), props = gas.props
  props.set("PHOTO_FOLDER_ID", "folder")
  let seq = 0
  const iterator = (items) => { let i = 0; return { hasNext: () => i < items.length, next: () => items[i++] } }
  const blob = (bytes, mime = "image/png", name = "") => ({ getBytes: () => [...bytes], getContentType: () => mime, getName: () => name })
  const privateItem = () => ({ getOwner: () => ({ getEmail: () => "owner@test" }), getEditors: () => [], getViewers: () => [], getSharingAccess: () => "PRIVATE", isTrashed() { return !!this.trashed } })
  const folder = { ...privateItem(), getId: () => "folder", getFilesByName: (name) => iterator([...files.values()].filter((f) => f.name === name && !f.trashed)), createFile: (data) => {
    const id = `drive-${++seq}`, bytes = data.getBytes()
    const file = { ...privateItem(), name: data.getName(), getId: () => id, getName() { return this.name }, getBlob: () => blob(bytes), getSize: () => bytes.length, getParents: () => iterator([folder]), setTrashed(value) { this.trashed = value } }
    files.set(id, file)
    return file
  } }
  Object.assign(gas.context.Utilities, { base64Decode: (s) => [...Buffer.from(s, "base64")], base64Encode: (bytes) => Buffer.from(bytes).toString("base64"), newBlob: blob, DigestAlgorithm: { SHA_256: "SHA_256" }, computeDigest: (_, bytes) => [...createHash("sha256").update(Buffer.from(bytes)).digest()] })
  gas.context.Session.getEffectiveUser = () => ({ getEmail: () => "owner@test" })
  gas.context.PropertiesService = { getScriptProperties: () => ({ getProperty: (key) => props.get(key) || null, setProperty: (key,value) => props.set(key,value), deleteProperty: (key) => props.delete(key) }) }
  gas.context.DriveApp = { Access: { PRIVATE: "PRIVATE" }, getFolderById: () => folder, getFileById: (id) => { if (!files.has(id)) throw Error("not found"); return files.get(id) } }
  gas.run("Seeder.ensure()")
  return { ...gas, files, props, folder }
}
