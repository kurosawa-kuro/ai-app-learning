/** 既存呼出の互換窓口。実行時に依存を組み立てる。 */
const UploadMaintenance = {
  pending(...args) {
    return ApplicationComposition.asset_maintenance().pending(...args)
  },
  candidates(...args) {
    return ApplicationComposition.asset_maintenance().candidates(...args)
  },
  trash(...args) {
    return ApplicationComposition.asset_maintenance().trash(...args)
  },
}
