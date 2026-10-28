/**
 * GASエディタ用の運用入口。まず showSetupGuide → inspectApplicationSetup。
 *
 * 読取のみ：inspect* / check*（checkColdListPerformanceはキャッシュを失効）
 * 新規準備：initializeDatabaseV2 / resumeInitializeDatabaseV2
 * 旧版移行：audit → migrate（繰返し）→ verifyFiles（繰返し）→ activate
 * 実データ作成・外部推論：testPhotoDiaryFlow / testOpenAIHello（個別に実行）
 *
 * 計測はGAS内の処理時間。ブラウザ往復・画像デコード・スマホ速度を含まない。
 * ログには本文・画像バイト・APIキーを出さない。処理本体はservice/modelに置く。
 * 公開関数はログだけを出し、google.script.runへの詳細返却はしない。
 */

/** [案内] 利用目的・副作用・実行順を表示。DBや外部APIにアクセスしない。 */
function showSetupGuide() {
  logSetupResult_("showSetupGuide", () => SetupService.guide())
}

/** [設定書込] エディタで開いた保存先を登録。業務表の初期化・移行はしない。 */
function bindDatabaseSpreadsheet() {
  logSetupResult_("bindDatabaseSpreadsheet", () => SetupService.bindDatabase())
}

/** [読取] DB・設定・Drive読取の総合診断。初期化・移行・AI推論はしない。 */
function inspectApplicationSetup() {
  logSetupResult_("inspectApplicationSetup", () => SetupService.inspect())
}
/** [読取] 全表の見出し・件数、移行進捗、次の操作。 */
function inspectDatabaseV2() {
  logSetupResult_("inspectDatabaseV2", () => SetupService.database())
}
/** [読取] Drive保存先の所有者・共有状態。書込成功を意味しない。 */
function checkDriveSetup() {
  checkDriveSetup_()
}
/** [設定確認のみ] キーの有無。有効性や課金・推論成功は検証しない。 */
function checkOpenAISetup() {
  checkOpenAISetup_()
}

/** [計測] 表ごとの直接読取＋通常一覧3回。DB書込・AI推論なし。 */
function checkPerformance() {
  logSetupResult_("checkPerformance", () => PerformanceService.all())
}
/** [計測] 全10表を各1回直接読む。行数・バイト数・処理時間を表示。 */
function checkDatabasePerformance() {
  logSetupResult_("checkDatabasePerformance", () => PerformanceService.database())
}
/** [計測] 通常一覧を最大3回。各回のキャッシュ有無と応答サイズを記録。 */
function checkListPerformance() {
  logSetupResult_("checkListPerformance", () => PerformanceService.list())
}
/** [キャッシュ変更＋計測] 世代を更新してから通常一覧を最大3回取得する。 */
function checkColdListPerformance() {
  logSetupResult_("checkColdListPerformance", () => PerformanceService.coldList())
}
/** [Drive読取＋計測] ready画像を最大3件取得。Drive全件取得・推論・画像作成はしない。 */
function checkPhotoPerformance() {
  logSetupResult_("checkPhotoPerformance", () => PerformanceService.photos())
}

/** [新規書込] 空環境を初期化。旧表がある環境は拒否する。 */
function initializeDatabaseV2() {
  logSetupResult_("initializeDatabaseV2", () => SetupService.initialize(false))
}
/** [再開書込] 新規環境の初期化途中だけを再開。旧環境の移行には使わない。 */
function resumeInitializeDatabaseV2() {
  logSetupResult_("resumeInitializeDatabaseV2", () => SetupService.initialize(true))
}
/** [読取] 旧6表の監査。Drive実体の読取検証は別。 */
function auditDatabaseV2() {
  logSetupResult_("auditDatabaseV2", () => DatabaseMigration.audit())
}
/** [書込] バックアップ・書込停止後、500行単位でコピー。resume=trueなら再実行。 */
function migrateDatabaseV2() {
  logSetupResult_("migrateDatabaseV2", () => DatabaseMigration.apply())
}
/** [Drive読取＋進捗書込] 10画像単位。resume=falseになるまで再実行。 */
function verifyDatabaseV2Files() {
  logSetupResult_("verifyDatabaseV2Files", () => DatabaseMigration.verifyFiles())
}
/** [切替] 再照合後にv2を有効化。デプロイは別操作。 */
function activateDatabaseV2() {
  logSetupResult_("activateDatabaseV2", () => DatabaseMigration.activate())
}
/** [キャッシュ変更] データを変更せず次回読取をfreshにする。 */
function clearDatabaseCache() {
  logSetupResult_("clearDatabaseCache", () => SetupService.clearCache())
}

/** [読取] 未完了の保存要求。本文を出さず要求IDと親の有無を表示。 */
function inspectPendingSaves() {
  logSetupResult_("inspectPendingSaves", () => SetupService.pendingSaves())
}
function inspectPendingUploads() {
  logSetupResult_("inspectPendingUploads", () => SetupService.pendingUploads())
}
function inspectPendingGenerations() {
  logSetupResult_("inspectPendingGenerations", () => SetupService.pendingGenerations())
}
/** [読取] 画像整理・30日経過AI履歴の候補数と先頭50件。削除しない。 */
function inspectCleanupCandidates() {
  logSetupResult_("inspectCleanupCandidates", () => SetupService.cleanupCandidates())
}

/** [外部推論] 固定の挨拶を1回送信。利用枠を消費する。 */
function testOpenAIHello() {
  logSetupResult_("testOpenAIHello", () => OpenAIProbe.hello())
}
/** [Drive/DB書込] 固定1px画像2枚・日記2件を作成し、再送・順序を検証する。 */
function testPhotoDiaryFlow() {
  logSetupResult_("testPhotoDiaryFlow", () => IntegrationVerification.photoDiary())
}

/** ID指定の復旧はエディタの一時ラッパーから呼ぶ。画面には公開しない。 */
function abandonGeneration_(id) {
  return GenerationMaintenance.abandon(id)
}
function cancelPendingSave_(requestId) {
  return DiaryService.cancel(requestId)
}

function checkDriveSetup_() {
  return logSetupResult_("checkDriveSetup", () => IntegrationSetup.checkDrive())
}
function checkOpenAISetup_() {
  return logSetupResult_("checkOpenAISetup", () => IntegrationSetup.checkOpenAI())
}

/** 想定外例外の生本文をログへ出さず、GAS実行自体は失敗として終了する。 */
function logSetupResult_(operation, action) {
  try {
    const result = action()
    const output = Array.isArray(result) ? { items: result, count: result.length } : result
    console.log(JSON.stringify({ operation, ...output }))
    return result
  } catch (error) {
    const known = typeof AppError !== "undefined" && error instanceof AppError
    const code = known ? error.code : "setup_failed"
    const message = known ? error.message : "操作に失敗しました。設定・表の状態・実行権限を確認してください。"
    console.log(JSON.stringify({ operation, ok: false, code, message }))
    throw new Error(operation + ": " + code)
  }
}
