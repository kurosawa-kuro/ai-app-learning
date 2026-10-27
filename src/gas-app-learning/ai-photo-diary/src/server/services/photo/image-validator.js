/** サーバー側の容量・形式・寸法検証。拡張子と申告MIMEだけでは通さない。 */
const ImageValidator = {
  decode(input) {
    const limits = Settings.uploads()
    if (!input || !["image/jpeg", "image/png"].includes(input.mimeType) || typeof input.base64 !== "string" || input.base64.length > Math.ceil(limits.maxBytes / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.base64)) throw new AppError("invalid_image", "JPEG・PNGの静止画を選んでください（保存サイズ1MiB以下）。")
    const bytes = Utilities.base64Decode(input.base64)
    if (!bytes.length || bytes.length > limits.maxBytes) throw new AppError("invalid_image", "画像の容量が上限を超えています。")
    const b = bytes.map((v) => v & 255)
    const u16 = (i) => b[i] * 256 + b[i + 1]
    const u32 = (i) => b[i] * 16777216 + b[i + 1] * 65536 + b[i + 2] * 256 + b[i + 3]
    let width = 0, height = 0, valid = false
    if (input.mimeType === "image/png" && b.slice(0, 8).join() === "137,80,78,71,13,10,26,10") {
      let p = 8, data = false, first = true
      while (p + 12 <= b.length) {
        const size = u32(p), kind = String.fromCharCode(...b.slice(p + 4, p + 8))
        if (p + 12 + size > b.length || kind === "acTL") break
        if (first && (kind !== "IHDR" || size !== 13)) break
        if (kind === "IHDR") { if (!first) break; width = u32(p + 8); height = u32(p + 12) }
        first = false
        if (kind === "IDAT") data = true
        if (kind === "IEND") { valid = size === 0 && data && p + 12 === b.length; break }
        p += 12 + size
      }
    } else if (input.mimeType === "image/jpeg" && b[0] === 255 && b[1] === 216 && b[b.length - 2] === 255 && b[b.length - 1] === 217) {
      let p = 2
      while (p + 4 < b.length && b[p] === 255) {
        while (b[p] === 255) p++
        const marker = b[p++], size = u16(p)
        if (size < 2 || p + size > b.length) break
        if ([192, 193, 194].includes(marker) && size >= 8) { height = u16(p + 3); width = u16(p + 5) }
        if (marker === 218) { valid = width > 0 && height > 0; break }
        p += size
      }
    }
    if (!valid || !width || !height || width > limits.maxEdge || height > limits.maxEdge) throw new AppError("invalid_image", "画像形式または寸法が正しくありません。静止画を選び直してください。")
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes).map((v) => (v & 255).toString(16).padStart(2, "0")).join("")
    return { bytes, digest, mimeType: input.mimeType, width, height }
  },
}
