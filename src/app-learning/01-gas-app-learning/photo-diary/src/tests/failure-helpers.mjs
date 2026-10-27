// Sheetsの書込境界で障害を1回だけ注入する。業務メソッドを置き換えず再送経路を検証する。
export function failNextWrite(gas, table, { after = false } = {}) {
  const sheet = gas.sheets.get("v2_" + table)
  if (!sheet) throw Error("障害対象の表がありません: " + table)
  const original = sheet.getRange
  let fired = false
  sheet.getRange = (...args) => {
    const range = original(...args)
    const set = range.setValues
    range.setValues = values => {
      if (fired || args[0] === 1) return set(values)
      fired = true
      if (after) set(values)
      throw Error("テスト用の書込障害")
    }
    return range
  }
  return { get fired() { return fired }, restore() { sheet.getRange = original } }
}

export const rows = (gas, table) => JSON.parse(JSON.stringify(gas.run("SheetStore.readFresh(" + JSON.stringify(table) + ")")))
export const snapshot = gas => JSON.stringify([...gas.sheets].map(([name, sheet]) => [name, sheet.rows]))
