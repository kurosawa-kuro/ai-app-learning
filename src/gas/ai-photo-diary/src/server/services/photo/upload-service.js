/** 既存呼出の互換窓口。実行時に依存を組み立てる。 */
const UploadService = {
  upload(...args) {
    return ApplicationComposition.upload().upload(...args)
  },
  read(...args) {
    return ApplicationComposition.upload().read(...args)
  },
}
