/** 新規環境のみ初期化。既存環境の欠損や旧版は自動復元しない。 */
const Seeder = {
  needed({ strict = false } = {}) {
    if (!strict && TableCache.isSchemaReady()) return false
    const props = PropertiesService.getScriptProperties()
    if (props.getProperty("DB_SCHEMA_VERSION") === "2") {
      if (strict) SheetStore.validate()
      if (SheetStore.missingTables().length)
        throw new AppError("schema_missing", "必要な表がありません。バックアップから復元してください。")
      TableCache.markSchemaReady()
      return false
    }
    return true
  },
  ensureIfNeeded() {
    if (this.needed()) withLock_(() => this.ensure())
  },
  ensure() {
    if (!this.needed({ strict: true })) return
    if (SheetStore.existingSheets(Object.keys(LEGACY_TABLES)).length)
      throw new AppError("migration_required", "旧データがあります。管理者によるv2移行が必要です。")
    if (Object.keys(TABLES).some((n) => SheetStore.sheet(n)))
      throw new AppError("migration_required", "初期化または移行が途中です。管理者による再開が必要です。")
    this.initialize()
  },
  initialize() {
    if (SheetStore.existingSheets(Object.keys(LEGACY_TABLES)).length)
      throw new AppError("migration_required", "旧データは移行してください。")
    if (PropertiesService.getScriptProperties().getProperty("DB_SCHEMA_VERSION") === "2") return
    SheetStore.ensureTables()
    let marker = SheetStore.readFresh("schema_migrations").find((r) => r.version === "2")
    if (marker && marker.name !== "fresh-v2") throw new AppError("migration_conflict", "別の移行が進行中です。")
    const now = marker ? marker.started_at : new Date()
    if (!marker)
      SheetStore.append("schema_migrations", [
        { version: "2", name: "fresh-v2", checksum: payloadHash_(TABLES), state: "running", started_at: now },
      ])
    PhotoService.seedAssets(now)
    const tags = new Set(SheetStore.readFresh("tags").map((r) => r.id))
    SheetStore.append(
      "tags",
      MasterData.tags().filter((r) => !tags.has(r.id))
    )
    MasterData.samplePosts().forEach((p) => {
      if (DiaryRepository.findById(p.id, true)) return
      DiaryRepository.clearIncompleteChildren(p.id)
      DiaryRepository.insert({
        id: p.id,
        title: p.title,
        body: p.body,
        createdAt: new Date(now.getTime() - p.hoursAgo * 3600000),
        photos: p.images.map((img) => ({ id: img.id, fileId: AssetRepository.resolve(img.file, true).id })),
        tagIds: p.tags,
      })
    })
    SheetStore.update("schema_migrations", "2", { state: "succeeded", completed_at: new Date() })
    PropertiesService.getScriptProperties().setProperty("DB_SCHEMA_VERSION", "2")
    TableCache.clear()
    TableCache.markSchemaReady()
  },
}
