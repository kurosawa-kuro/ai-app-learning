/**
 * タグ（tags シート）の読み出し。タグの管理画面は作らないので、書き込みは初期データ（db/seeder.js）だけ。
 */
const TagRepository = {
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
