/** 日記の本文と選択数の成立条件。保存先・設定・参照取得に依存しない。 */
const DiaryPolicy = {
  text(data, limits) {
    const source = data || {}
    const title = source.title == null ? "" : String(source.title).trim()
    const body = source.body == null ? "" : String(source.body).replace(/\s+$/, "")
    if (title === "") throw new AppError("invalid", "タイトルを入力してください。")
    if (title.length > limits.title) throw new AppError("invalid", `タイトルは${limits.title}文字以内にしてください。`)
    if (body.trim() === "") throw new AppError("invalid", "本文を入力してください。")
    if (body.length > limits.body) throw new AppError("invalid", `本文は${limits.body}文字以内にしてください。`)
    return { title, body }
  },
  selection(ids, maximum, label, unit) {
    if (ids.length > maximum) throw new AppError("invalid", `${label}は${maximum}${unit}までです。`)
  },
}
