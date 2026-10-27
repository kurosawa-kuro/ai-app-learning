/** 既存呼出の互換窓口。実行時に依存を組み立てる。 */
const GenerationMaintenance = {
  candidates(...args) {
    return ApplicationComposition.generation_maintenance().candidates(...args)
  },
  purge(...args) {
    return ApplicationComposition.generation_maintenance().purge(...args)
  },
  inspect(...args) {
    return ApplicationComposition.generation_maintenance().inspect(...args)
  },
  abandon(...args) {
    return ApplicationComposition.generation_maintenance().abandon(...args)
  },
}
