/** 認証準備用の設定。秘密値は画面・生成データ・診断結果へ渡さない。 */
const IntegrationSettings = {
  photoFolderId() {
    return (PropertiesService.getScriptProperties().getProperty("PHOTO_FOLDER_ID") || "").trim()
  },

  openaiKeyConfigured() {
    return Boolean(this.openaiApiKey())
  },

  openaiApiKey() {
    return (PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY") || "").trim()
  },

  openaiModel() {
    return (PropertiesService.getScriptProperties().getProperty("OPENAI_MODEL") || "gpt-4.1-mini").trim()
  },
  saveOpenAIKey(value) {
    if (typeof value !== "string" || (value && !/^sk-[A-Za-z0-9_-]{20,512}$/.test(value))) throw new AppError("invalid", "OpenAI APIキーの形式を確認してください。");
    const props=PropertiesService.getScriptProperties();
    if(value)props.setProperty("OPENAI_API_KEY",value);else props.deleteProperty("OPENAI_API_KEY");
  },
}
