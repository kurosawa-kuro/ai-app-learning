/** 日記入力の参照検証。外部操作は注入されたportsを通す。 */
function createDiaryValidationApplication_(ports) {
  return {
    /** 日記の作成：{ title, body, photoIds, tagIds } に整えて返す。 */
    forCreate(data, tagsById) {
      const limits = ports.settings.limits()
      const source = data || {}
      const { title, body } = DiaryPolicy.text(source, limits)
      return { title, body, photoIds: this.photoIds(source.imageIds), tagIds: this.tagIds(source.tagIds, tagsById) }
    },

    /** 写真の ID：提供元にあるものだけ。重複は 1 つにし、選んだ順を表示順にする。 */
    photoIds(value) {
      const ids = uniqueStrings_(value, "写真")
      const max = ports.photos.maxPerPost()
      DiaryPolicy.selection(ids, max, "写真", "枚")
      if (ids.some((id) => !ports.photos.exists(id)))
        throw new AppError("invalid", "選べない写真が含まれています。画面を開き直してください。")
      return ids
    },

    /** タグの ID：tags にあるものだけ。重複は 1 つにする（post_tags の二重登録を防ぐ）。 */
    tagIds(value, tagsById) {
      const ids = uniqueStrings_(value, "キーワード")
      const max = ports.settings.limits().tags
      DiaryPolicy.selection(ids, max, "キーワード", "個")
      if (ids.some((id) => !tagsById.has(id)))
        throw new AppError("invalid", "存在しないキーワードが含まれています。画面を開き直してください。")
      return ids
    },
  }
}
