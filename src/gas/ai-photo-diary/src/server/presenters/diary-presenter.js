/**
 * 日記の集約を、画面に渡す形にする。
 * google.script.run は Date を渡せないので、日時は "yyyy-MM-dd'T'HH:mm:ssXXX" の文字列にする（表示の整形は画面側）。
 * 写真は PhotoService.view の形（提供元が決める表示用の情報）に表示順 sort_order を足して渡す。
 */
const DiaryPresenter = {
  list(diaries) {
    const view = PhotoService.viewResolver()
    return diaries.map((diary) => this.listItem(diary, view))
  },
  /**
   * 一覧の 1 件：代表写真・写真の枚数・本文の冒頭に加え、詳細と同じ本文・全写真も入れる。
   * 画面は一覧から詳細を開くとき、これを使い回して往復しない（docs/GAS性能_調査と対応方針.md 対応 B）。
   */
  listItem(diary, view = PhotoService.viewResolver()) {
    const flat = diary.body.replace(/\s+/g, " ").trim()
    const max = Settings.limits().excerpt
    const images = diary.photos.map((photo) => photoView_(photo, view))
    return {
      id: diary.id,
      title: diary.title,
      source_generation_id: diary.sourceGenerationId || "",
      created_at: isoDateTime_(diary.createdAt),
      tags: diary.tags,
      excerpt: flat.length > max ? flat.slice(0, max) + "…" : flat,
      image: images.length ? images[0] : null,
      imageCount: diary.photos.length,
      body: diary.body,
      images,
    }
  },

  /** 詳細：本文と全写真（表示順）。 */
  detail(diary) {
    const view = PhotoService.viewResolver()
    return {
      id: diary.id,
      title: diary.title,
      source_generation_id: diary.sourceGenerationId || "",
      created_at: isoDateTime_(diary.createdAt),
      tags: diary.tags,
      body: diary.body,
      images: diary.photos.map((photo) => photoView_(photo, view)),
    }
  },
}

function photoView_(photo, view) {
  return Object.assign({}, view(photo.fileId), { sort_order: photo.sortOrder })
}

function isoDateTime_(date) {
  return date instanceof Date ? Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX") : ""
}
