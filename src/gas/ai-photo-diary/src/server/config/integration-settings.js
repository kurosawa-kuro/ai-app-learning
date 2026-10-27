/** 認証準備用の設定。秘密値は画面・生成データ・診断結果へ渡さない。 */
const IntegrationSettings = {
  photoFolderId() {
    return (PropertiesService.getScriptProperties().getProperty("PHOTO_FOLDER_ID") || "").trim()
  },

  geminiKeyConfigured() {
    return Boolean(this.geminiApiKey())
  },

  geminiApiKey() {
    return (PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "").trim()
  },

  geminiModel() {
    return (PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL") || "gemini-3.5-flash-lite").trim()
  },
}
