/** 依存を組み立てる入口。ファイル読込時に初期化しない。 */
const ApplicationComposition = {
  tags() { return createTagManagementApplication_({database:Seeder,tags:TagRepository,lock:withLock_,ids:{next:()=>Utilities.getUuid()}}) },
  diary() {
    return createDiaryApplication_({
      database: Seeder,
      diaries: DiaryRepository,
      requests: RequestRepository,
      tags: TagRepository,
      validation: DiaryValidator,
      photos: PhotoService,
      generations: GenerationRepository,
      lock: withLock_,
      hash: payloadHash_,
      clock: { date: () => new Date(), now: () => Date.now() },
    })
  },
  generation() {
    return createGenerationApplication_({
      database: Seeder,
      tags: TagRepository,
      validation: DiaryValidator,
      photos: PhotoService,
      generations: GenerationRepository,
      assets: AssetRepository,
      settings: Settings,
      lock: withLock_,
      hash: payloadHash_,
      clock: { date: () => new Date(), now: () => Date.now() },
      ids: { next: () => Utilities.getUuid() },
      providers: () => DraftService.providers_(),
    })
  },
  upload() {
    return createUploadApplication_({
      database: Seeder,
      assets: AssetRepository,
      uploads: UploadRepository,
      storage: DriveStore,
      images: ImageValidator,
      lock: withLock_,
      hash: payloadHash_,
      clock: { date: () => new Date(), now: () => Date.now() },
      ids: { next: () => Utilities.getUuid() },
    })
  },
  photo() {
    return createPhotoApplication_({
      assets: AssetRepository,
      upload: UploadService,
      storage: DriveStore,
      settings: Settings,
      providers: () => PhotoService.providers_(),
    })
  },
  asset_maintenance() {
    return createAssetMaintenanceApplication_({
      formatDate: isoDateTime_,
      assets: AssetRepository,
      uploads: UploadRepository,
      storage: DriveStore,
      settings: Settings,
      lock: withLock_,
      clock: { date: () => new Date(), now: () => Date.now() },
    })
  },
  generation_maintenance() {
    return createGenerationMaintenanceApplication_({
      formatDate: isoDateTime_,
      generations: GenerationRepository,
      lock: withLock_,
      clock: { date: () => new Date(), now: () => Date.now() },
    })
  },
  diary_validation() {
    return createDiaryValidationApplication_({
      photos: PhotoService,
      settings: Settings,
    })
  },
}
