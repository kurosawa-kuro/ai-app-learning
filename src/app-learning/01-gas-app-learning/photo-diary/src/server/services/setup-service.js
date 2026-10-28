/** 診断と次の操作の案内。総合診断から初期化・移行を実行しない。 */
const SetupService = {
  guide() {
    return {
      first: ["bindDatabaseSpreadsheet（保存先の初回登録）", "inspectApplicationSetup", "inspectDatabaseV2"],
      performance: {
        checkPerformance: "DB直接読取＋通常一覧。AI推論・業務データ書込なし",
        checkDatabasePerformance: "各表1回。行数・サイズ・読取時間",
        checkListPerformance: "通常一覧3回。キャッシュ状態と応答サイズ",
        checkColdListPerformance: "キャッシュ世代更新後に通常一覧3回",
        checkPhotoPerformance: "readyのDrive画像を最大3件取得。画像バイトはログに出さない",
      },
      newDatabase: ["bindDatabaseSpreadsheet", "initializeDatabaseV2", "inspectApplicationSetup"],
      migration: [
        "バックアップと旧版を含む書込停止",
        "auditDatabaseV2",
        "migrateDatabaseV2（resumeなら繰返し）",
        "verifyDatabaseV2Files（resumeなら繰返し）",
        "activateDatabaseV2",
        "既存デプロイ更新",
      ],
      inspection: [
        "inspectPendingSaves",
        "inspectPendingUploads",
        "inspectPendingGenerations",
        "inspectCleanupCandidates",
      ],
      explicitSideEffects: {
        testOpenAIHello: "OpenAIへ固定入力を送る",
        testPhotoDiaryFlow: "画像2枚と日記2件を作る",
        clearDatabaseCache: "キャッシュ世代だけ更新",
      },
      runbook: "docs/08_release_runbook.md",
    }
  },
  database() {
    const schemaVersion = PropertiesService.getScriptProperties().getProperty("DB_SCHEMA_VERSION") || ""
    const detail = SetupRepository.inspect()
    const allReady = detail.tables.every((r) => r.state === "ready")
    let state, next
    if (schemaVersion === "2") {
      state = allReady ? "ready" : "repair_required"
      next = allReady ? ["checkPerformance"] : ["バックアップと欠損・見出しを確認。自動再初期化しない"]
    } else if (schemaVersion && schemaVersion !== "2") {
      state = "unsupported_version"
      next = ["稼働版と設定を確認。移行や初期化を実行しない"]
    } else if (detail.tables.some((t) => ["schema_mismatch", "read_failed"].includes(t.state))) {
      state = "repair_required"
      next = ["表の見出し・アクセス権とバックアップを確認。初期化や移行を進めない"]
    } else if (detail.legacyTables.length) {
      state = "migration_required"
      next = ["auditDatabaseV2", "docs/08_release_runbook.md"]
      if (detail.migration && detail.migration.state === "verified")
        next = ["verifyDatabaseV2Files", "activateDatabaseV2"]
      else if (detail.migration && detail.migration.state === "succeeded") next = ["activateDatabaseV2"]
      else if (detail.migration && detail.migration.state === "running") next = ["migrateDatabaseV2"]
    } else if (detail.tables.some((t) => t.state !== "missing")) {
      state = "initialization_incomplete"
      next = ["resumeInitializeDatabaseV2"]
    } else {
      state = "empty"
      next = ["initializeDatabaseV2"]
    }
    return { ok: state === "ready", state, schemaVersion, ...detail, next, externalFilesVerified: false }
  },
  inspect() {
    const database = this.database(),
      providers = Settings.providers()
    const drive =
      providers.photo === "drive"
        ? IntegrationSetup.checkDrive()
        : { ok: true, skipped: true, reason: "新規写真提供元がDriveではありません" }
    const openai =
      providers.draft === "openai"
        ? IntegrationSetup.checkOpenAI()
        : { ok: true, skipped: true, reason: "下書き提供元がmockです" }
    return {
      readyForVerification: database.ok && drive.ok && openai.ok,
      providers,
      database,
      drive: { ok: drive.ok, code: drive.code, skipped: drive.skipped, writeVerified: false },
      openai,
      inferenceExecuted: false,
      note: "設定の準備状況です。公開画面・書込・推論の成功は別途確認してください。",
    }
  },
  requireReady() {
    if (PropertiesService.getScriptProperties().getProperty("DB_SCHEMA_VERSION") !== "2")
      throw new AppError(
        "setup_required",
        "DB v2の初期化・移行を先に完了してください。inspectDatabaseV2で確認できます。"
      )
    SheetStore.validate()
  },
  initialize(resume) {
    return withLock_(() => {
      SheetStore.bindActive()
      if (resume) Seeder.initialize()
      else Seeder.ensure()
      this.requireReady()
      return { initialized: true, schemaVersion: "2", next: ["inspectApplicationSetup"] }
    })
  },
  bindDatabase() {
    return withLock_(() => {
      SheetStore.bindActive()
      return { bound: true, businessDataChanged: false, next: ["inspectApplicationSetup"] }
    })
  },
  clearCache() {
    return withLock_(() => {
      TableCache.clear()
      return { cleared: true, businessDataChanged: false }
    })
  },
  page(rows) {
    return {
      total: rows.length,
      shown: Math.min(rows.length, 50),
      truncated: rows.length > 50,
      items: rows.slice(0, 50),
    }
  },
  pendingSaves() {
    this.requireReady()
    return this.page(SetupRepository.pendingSaves())
  },
  pendingUploads() {
    this.requireReady()
    return this.page(UploadMaintenance.pending())
  },
  pendingGenerations() {
    this.requireReady()
    return this.page(GenerationMaintenance.inspect())
  },
  cleanupCandidates() {
    this.requireReady()
    return {
      images: this.page(UploadMaintenance.candidates()),
      generations: this.page(GenerationMaintenance.candidates()),
      deleted: false,
    }
  },
}
