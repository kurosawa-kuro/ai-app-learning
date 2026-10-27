function uniqueStrings_(value, label) {
  if (value == null) return []
  if (!Array.isArray(value)) throw new AppError("invalid", `${label}の指定が正しくありません。`)
  const out = []
  value.forEach((v) => {
    const s = String(v)
    if (s !== "" && out.indexOf(s) === -1) out.push(s)
  })
  return out
}

function requireRequestId_(id) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(id))
    throw new AppError("invalid", "要求IDが正しくありません。画面を開き直してください。")
  return id
}

function utf8Bytes_(text) {
  let bytes = 0
  for (const ch of text) {
    const code = ch.codePointAt(0)
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4
  }
  return bytes
}
