/** 既存呼出の互換窓口。実行時に依存を組み立てる。 */
const DiaryValidator = {
  forCreate(...args) {
    return ApplicationComposition.diary_validation().forCreate(...args)
  },
  photoIds(...args) {
    return ApplicationComposition.diary_validation().photoIds(...args)
  },
  tagIds(...args) {
    return ApplicationComposition.diary_validation().tagIds(...args)
  },
}
