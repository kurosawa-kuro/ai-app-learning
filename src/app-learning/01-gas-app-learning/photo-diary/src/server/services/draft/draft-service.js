/** 既存呼出の互換窓口。実行時に依存を組み立てる。 */
const DraftService = {
  providers_: () => ({ mock: MockDraftProvider, openai: OpenAIDraftProvider }),
  provider_(...args) {
    return ApplicationComposition.generation().provider_(...args)
  },
  generate(...args) {
    return ApplicationComposition.generation().generate(...args)
  },
}
