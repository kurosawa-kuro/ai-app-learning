/** G2専用。日記・写真・個人設定は送信しない。 */
const OpenAIProbe = {
  hello() {
    const result = OpenAIClient.generateText({
      model: IntegrationSettings.openaiModel(),
      text: "こんにちは。短く挨拶を返してください",
      maxOutputTokens: 256,
    })
    return { ...result, apiAuthenticationVerified: result.ok, inferenceExecuted: result.ok }
  },
}
