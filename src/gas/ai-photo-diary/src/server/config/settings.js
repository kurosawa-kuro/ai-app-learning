/**
 * 設定（data/config.yaml）とマスター（data/sample-data.yaml・data/tags.csv）への唯一の入口。
 * 値は npm run build:data が書き出す server/config/generated.js（APP_CONFIG / APP_DATA）にある。
 * 他のファイルは APP_CONFIG / APP_DATA を直接読まず、ここを通す。
 */
const Settings = {
  app: () => APP_CONFIG.app,
  limits: () => APP_CONFIG.limits,
  providers: () => APP_CONFIG.providers,
  ai: () => APP_CONFIG.ai,
  uploads: () => APP_CONFIG.uploads,
  diaryPreferences: () => DIARY_PREFERENCES,
  requestCacheSeconds: () => APP_CONFIG.requestCacheSeconds,
  lockWaitMs: () => APP_CONFIG.lockWaitMs,
  retiredSheets: () => APP_CONFIG.retiredSheets,
}

const MasterData = {
  photos: () => APP_DATA.images, // ダミー写真の目録（DummyPhotoProvider が使う）
  tags: () => APP_DATA.tags, // タグマスター（tags シートを新しく作ったときだけ入れる）
  samplePosts: () => APP_DATA.samplePosts, // サンプル日記（posts シートを新しく作ったときだけ入れる）
  draft: () => APP_DATA.draft, // AI 下書きの固定の文章（MockDraftProvider が使う）
}
