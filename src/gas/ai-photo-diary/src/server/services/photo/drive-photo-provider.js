/** Drive資産の表示情報。画像バイトは遅延取得する。 */
const DrivePhotoProvider = {
  catalog: () => [],
  view(key, asset) {
    const a = asset || AssetRepository.resolve(key)
    return a
      ? { kind: "drive", label: "アップロード画像", byte_size: Number(a.byte_size) }
      : { kind: "missing", label: "画像を取得できません" }
  },
  maxPerPost: () => Settings.uploads().maxImages,
}
