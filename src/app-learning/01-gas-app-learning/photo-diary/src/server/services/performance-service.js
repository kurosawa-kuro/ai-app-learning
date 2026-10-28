/** GAS内の読取性能。業務データを書かず、AI推論しない。 */
const PerformanceService = {
  SAMPLE_COUNT: 3,
  SOFT_BUDGET_MS: 20000,
  tableNames_: () => ["posts", "post_assets", "tags", "post_tags", "assets"],
  measure_(action) {
    const started = Date.now(),
      value = action()
    return { elapsedMs: Date.now() - started, value }
  },
  summary_(values) {
    if (!values.length) return null
    const sorted = values.slice().sort((a, b) => a - b),
      middle = Math.floor(sorted.length / 2)
    return {
      minMs: sorted[0],
      medianMs: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
      maxMs: sorted[sorted.length - 1],
      meanMs: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    }
  },
  cacheState_() {
    const generation = TableCache.generation()
    return {
      enabled: generation !== null,
      tablesPresent: Object.keys(TableCache.getMany(this.tableNames_(), generation)),
    }
  },
  database() {
    SetupService.requireReady()
    const started = Date.now(),
      tables = []
    for (const name of Object.keys(TABLES)) {
      if (tables.length && Date.now() - started >= this.SOFT_BUDGET_MS) break
      tables.push(SetupRepository.measureTable(name))
    }
    return {
      scope: "GAS内部・直接読取",
      tableCount: tables.length,
      plannedTables: Object.keys(TABLES).length,
      complete: tables.length === Object.keys(TABLES).length,
      totalMs: Date.now() - started,
      tables,
      note: "readMsはgetValuesと行変換。serializedBytesの計算時間はtotalMsだけに含みます。実ファイル・OpenAI・ブラウザ通信は計測しません。",
    }
  },
  list() {
    SetupService.requireReady()
    const started = Date.now(),
      samples = []
    for (let i = 0; i < this.SAMPLE_COUNT; i++) {
      if (samples.length && Date.now() - started >= this.SOFT_BUDGET_MS) break
      const cacheBefore = this.cacheState_()
      const measured = this.measure_(() => {
        const result = DiaryService.list(null)
        return { tag: result.tag, tags: result.tags, posts: DiaryPresenter.list(result.diaries) }
      })
      const payloadBytes = utf8Bytes_(JSON.stringify(measured.value))
      samples.push({
        iteration: i + 1,
        serverMs: measured.elapsedMs,
        rows: measured.value.posts.length,
        payloadBytes,
        cacheBefore,
        cacheAfter: this.cacheState_(),
      })
    }
    return {
      scope: "GAS内部・通常一覧（presenterを含む）",
      requestedSamples: this.SAMPLE_COUNT,
      completedSamples: samples.length,
      complete: samples.length === this.SAMPLE_COUNT,
      summary: this.summary_(samples.map((s) => s.serverMs)),
      samples,
      note: "1回目も既存キャッシュを使い得ます。2回目以降も容量・失効次第で再読取します。ブラウザ往復・HTML描画は含みません。",
    }
  },
  coldList() {
    SetupService.requireReady()
    SetupService.clearCache()
    return {
      cacheInvalidated: true,
      ...this.list(),
      note: "直前に共有キャッシュ世代を更新しました。他の実行による再充填はあり得ます。各回のcacheBeforeを確認してください。",
    }
  },
  photos() {
    SetupService.requireReady()
    const candidates = AssetRepository.list(true).filter((r) => r.storage_kind === "drive" && r.state === "ready")
    const started = Date.now(),
      samples = []
    for (const asset of candidates.slice(0, this.SAMPLE_COUNT)) {
      if (samples.length && Date.now() - started >= this.SOFT_BUDGET_MS) break
      const at = Date.now()
      try {
        const image = UploadService.read(asset.id)
        samples.push({
          assetId: asset.id,
          ok: true,
          serverMs: Date.now() - at,
          bytes: image.bytes,
          mimeType: image.mimeType,
        })
      } catch (error) {
        samples.push({
          assetId: asset.id,
          ok: false,
          serverMs: Date.now() - at,
          code: error instanceof AppError ? error.code : "image_read_failed",
        })
      }
    }
    return {
      scope: "GAS内部・Drive画像取得と検証",
      availableImages: candidates.length,
      plannedSamples: Math.min(candidates.length, this.SAMPLE_COUNT),
      completedSamples: samples.length,
      samples,
      summary: this.summary_(samples.filter((s) => s.ok).map((s) => s.serverMs)),
      note: "台帳順の最大3件です。画像作成・推論・ブラウザの転送やデコードは行いません。失敗時の外部エラー生本文は出しません。",
    }
  },
  all() {
    return {
      database: this.database(),
      list: this.list(),
      photoCheck: "画像取得はcheckPhotoPerformanceを別途実行してください。",
    }
  },
}
