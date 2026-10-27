/** 既存呼出の互換窓口。実行時に依存を組み立てる。 */
const PhotoService = {
  providers_: () => ({ dummy: DummyPhotoProvider, drive: DrivePhotoProvider }),
  provider_(...args) {
    return ApplicationComposition.photo().provider_(...args)
  },
  seedAssets(...args) {
    return ApplicationComposition.photo().seedAssets(...args)
  },
  catalog(...args) {
    return ApplicationComposition.photo().catalog(...args)
  },
  exists(...args) {
    return ApplicationComposition.photo().exists(...args)
  },
  assetId(...args) {
    return ApplicationComposition.photo().assetId(...args)
  },
  view(...args) {
    return ApplicationComposition.photo().view(...args)
  },
  viewResolver() {
    return ApplicationComposition.photo().viewResolver()
  },
  maxPerPost(...args) {
    return ApplicationComposition.photo().maxPerPost(...args)
  },
  validateAttachment(...args) {
    return ApplicationComposition.photo().validateAttachment(...args)
  },
  readForAi(...args) {
    return ApplicationComposition.photo().readForAi(...args)
  },
}
