const Settings = {
  lockWaitMs: () => 5000,
  ai: () => APP_CONFIG.ai,
  limits: () => APP_CONFIG.limits,
};
const IntegrationSettings = {
  openaiApiKey: () =>
    PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY") || "",
  keyConfigured() {
    return Boolean(this.openaiApiKey());
  },
  saveKey(value) {
    const props = PropertiesService.getScriptProperties();
    if (value === "") props.deleteProperty("OPENAI_API_KEY");
    else {
      if (typeof value !== "string" || !/^[A-Za-z0-9_-]{20,512}$/.test(value))
        throw new AppError(
          "validation_error",
          "APIキーの形式を確認してください。",
        );
      props.setProperty("OPENAI_API_KEY", value);
    }
  },
};
