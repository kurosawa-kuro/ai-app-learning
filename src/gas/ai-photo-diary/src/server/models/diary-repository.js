/**
 * 日記の読み書き。posts・post_assets・tags・post_tags の4表を結合し、
 * 日記 1 件を「本文＋写真＋タグ」のひとかたまり（集約）で返す。シートの列名はこのファイルの外に出さない。
 *
 * photosのfileIdは内部資産ID。画像メタデータはPhotoServiceがassetsから解決する。
 */
const DiaryRepository = {
  clearIncompleteChildren(id) {
    if (SheetStore.readFresh("posts").some((row) => row.id === id)) throw new Error("保存済み日記の関連は消せません")
    SheetStore.removeWhere("post_assets", "post_id", id)
    SheetStore.removeWhere("post_tags", "post_id", id)
  },
  /** 4 表を 1 回ずつ読み、新しい順の集約の一覧と、タグの一覧を返す。 */
  loadAll(fresh = false) {
    // 4 表を 1 回でまとめて読む（キャッシュにあれば Sheets を呼ばない）
    const tables = (fresh ? SheetStore.readManyFresh.bind(SheetStore) : SheetStore.readMany.bind(SheetStore))(["posts", "post_assets", "tags", "post_tags"])
    const posts = tables.posts
    const images = tables.post_assets
    const tags = TagRepository.fromRows(tables.tags)
    const postTags = tables.post_tags

    const tagsById = new Map(tags.map((t) => [t.id, t]))
    const photosByPost = groupBy_(images, (img) => img.post_id)
    const tagIdsByPost = new Map()
    postTags.forEach((pt) => {
      if (!tagsById.has(pt.tag_id)) return // 消されたタグへの関連は無視する
      const list = tagIdsByPost.get(pt.post_id) || []
      if (list.indexOf(pt.tag_id) === -1) list.push(pt.tag_id) // 重複した関連は 1 つに数える
      tagIdsByPost.set(pt.post_id, list)
    })

    // 結合は posts から始める。親の無い写真・タグの関連（書き込み途中の失敗の残り）は出てこない
    const diaries = posts
      .map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        sourceGenerationId: p.source_generation_id,
        createdAt: p.created_at instanceof Date ? p.created_at : null,
        photos: (photosByPost.get(p.id) || [])
          .map((img) => ({ fileId: img.asset_id, sortOrder: Number(img.sort_order) }))
          .sort((a, b) => a.sortOrder - b.sortOrder),
        tags: (tagIdsByPost.get(p.id) || []).map((id) => tagsById.get(id)),
      }))
      .sort((a, b) => timeOf_(b.createdAt) - timeOf_(a.createdAt))
    return { diaries, tags, tagsById }
  },

  findById(id, fresh = false) {
    return this.loadAll(fresh).diaries.find((d) => d.id === String(id)) || null
  },

  /** 既存と重ならない日記の ID を作る（Sheets に一意制約が無いため）。 */
  newId() {
    const used = new Set(SheetStore.readFresh("posts").map((p) => p.id))
    let id = Utilities.getUuid()
    while (used.has(id)) id = Utilities.getUuid()
    return id
  },

  /**
   * 日記 1 件を 3 表へ書く。検証は済ませてから呼ぶ。ロックの中で呼ぶ。
   * 子（写真・タグの関連）を先に、親（posts）を最後に書く。途中で失敗しても親の無い子は表に出ない。
   * photos：[{ id?, fileId }]（並び順がそのまま表示順）
   */
  insert({ id, title, body, createdAt, photos, tagIds, sourceGenerationId = "" }) {
    SheetStore.append("post_assets", photos.map((photo, i) => ({ id: photo.id || Utilities.getUuid(), post_id: id, asset_id: photo.fileId, sort_order: i + 1 })))
    SheetStore.append("post_tags", tagIds.map((tagId) => ({ post_id: id, tag_id: tagId })))
    SheetStore.append("posts", [{ id, title, body, created_at: createdAt, source_generation_id: sourceGenerationId }])
  },
}

function groupBy_(rows, keyOf) {
  const map = new Map()
  rows.forEach((row) => {
    const key = keyOf(row)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(row)
  })
  return map
}

function timeOf_(date) {
  return date instanceof Date ? date.getTime() : 0
}
