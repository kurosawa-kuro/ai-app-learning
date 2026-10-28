/**
 * タグ（tags シート）の読み出し。変更はロック内の管理操作からだけ行う。
 */
const TagRepository = {
  usage() { const counts = new Map(); SheetStore.readFresh("post_tags").forEach(row => counts.set(row.tag_id, (counts.get(row.tag_id)||0)+1)); return this.fresh().map(t => ({...t, used: counts.get(t.id)||0})) },
  insert(tag) { SheetStore.append("tags", [tag]); return tag },
  rename(id, name) { SheetStore.update("tags", id, {name}); return {id,name} },
  remove(id) { SheetStore.removeWhere("tags", "id", id) },
  fresh() { return this.fromRows(SheetStore.readFresh("tags")) },
  /** タグの一覧（id の順）。 */
  list() {
    return this.fromRows(SheetStore.read("tags"))
  },

  /** 読んだ行をタグの一覧にする。DiaryRepository が同じ行を使い回すために分けている。 */
  fromRows(rows) {
    return rows
      .map((t) => ({ id: t.id, name: t.name }))
      .sort((a, b) => Number(a.id) - Number(b.id) || a.id.localeCompare(b.id))
  },
}
