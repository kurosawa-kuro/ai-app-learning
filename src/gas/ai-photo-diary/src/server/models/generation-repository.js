/** 生成要求・入力・結果の永続化。 */
const GenerationRepository = {
  list: () => SheetStore.readFresh("ai_generations"),
  findRequest(id) {
    return this.list().find((r) => r.request_id === id)
  },
  find(id) {
    return this.list().find((r) => r.id === id)
  },
  insert(row, assets) {
    SheetStore.append("ai_generations", [row])
    SheetStore.append(
      "ai_generation_assets",
      assets.map((a, i) => ({ generation_id: row.id, asset_id: a.id, sort_order: i + 1, sha256: a.sha256 }))
    )
  },
  update(id, values) {
    SheetStore.update("ai_generations", id, { ...values, updated_at: new Date() })
  },
  requireSucceeded(id) {
    const row = this.find(id)
    if (!row || !GenerationPolicy.canAdopt(row.state))
      throw new AppError("invalid", "採用元の生成結果が見つかりません。")
    return row
  },
  result(row) {
    return { title: row.output_title, body: row.output_body, mock: row.provider === "mock", generationId: row.id }
  },
  removeAssetReferences(id) {
    SheetStore.removeWhere("ai_generation_assets", "generation_id", id)
  },
  references(id) {
    return SheetStore.readFresh("ai_generation_assets").filter((r) => r.generation_id === id)
  },
}
