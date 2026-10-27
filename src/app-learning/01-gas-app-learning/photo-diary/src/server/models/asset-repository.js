/** 画像資産の正本。転送台帳を消しても画像を解決できる。 */
const AssetRepository = {
  list(fresh = false) {
    return fresh ? SheetStore.readFresh("assets") : SheetStore.read("assets")
  },
  find(id, fresh = false) {
    return this.list(fresh).find((r) => r.id === id)
  },
  resolve(id, fresh = false) {
    const rows = this.list(fresh)
    return rows.find((r) => r.id === id) || rows.find((r) => r.storage_key === id)
  },
  insert(row) {
    SheetStore.append("assets", [row])
  },
  update(id, values) {
    SheetStore.update("assets", id, { ...values, updated_at: new Date() })
  },
  referenced() {
    const ids = new Set(SheetStore.readFresh("post_assets").map((r) => r.asset_id))
    const active = new Set(
      SheetStore.readFresh("ai_generations")
        .filter((r) => ["pending", "running", "unknown"].includes(r.state))
        .map((r) => r.id)
    )
    SheetStore.readFresh("ai_generation_assets").forEach((r) => {
      if (active.has(r.generation_id)) ids.add(r.asset_id)
    })
    return ids
  },
}
