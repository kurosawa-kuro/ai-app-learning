/** 既存呼出の互換窓口。実行時に依存を組み立てる。 */
const DiaryService = {
  list(...args) {
    return ApplicationComposition.diary().list(...args)
  },
  get(...args) {
    return ApplicationComposition.diary().get(...args)
  },
  normalize(...args) {
    return ApplicationComposition.diary().normalize(...args)
  },
  create(...args) {
    return ApplicationComposition.diary().create(...args)
  },
  cancel(...args) {
    return ApplicationComposition.diary().cancel(...args)
  },
}
