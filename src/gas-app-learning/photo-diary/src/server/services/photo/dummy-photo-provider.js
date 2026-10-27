/**
 * 写真の提供元（ダミー）。data/sample-data.yaml の images の目録にある id だけを「ある写真」とし、
 * 画面には絵を描く材料（名前と色相）を渡す。画像ファイルは持たない。
 *
 * 写真の提供元が満たす形（Drive 版を足すときも同じ形にする）：
 *   catalog()        -> 選べる写真の表示用の情報の一覧
 *   exists(fileId)   -> その写真があるか
 *   view(fileId)     -> 表示用の情報 { file_id, label, kind, ... }（kind が "dummy" なら画面が絵を描く。url があれば画面はそれを表示する）
 *   maxPerPost()     -> 1 つの日記に付けられる枚数
 */
const DummyPhotoProvider = {
  catalog() {
    return MasterData.photos().map((p) => this.view(p.id))
  },

  exists(fileId) {
    return MasterData.photos().some((p) => p.id === fileId)
  },

  view(fileId) {
    const photo = MasterData.photos().find((p) => p.id === fileId)
    if (!photo) return { file_id: fileId, label: "", kind: "missing" }
    return { file_id: photo.id, label: photo.label, kind: "dummy", hue: photo.hue }
  },

  maxPerPost() {
    return MasterData.photos().length
  },
}
