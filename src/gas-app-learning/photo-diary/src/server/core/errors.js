/**
 * 利用者に見せてよいエラー（AppError）と、公開関数の応答の形（{ ok, data } / { ok: false, error }）。
 */
class AppError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code // invalid / not_found / busy など。画面はこれで出し分ける
  }
}

/** 公開関数の中身を包み、例外を { ok: false, error } に変える。想定外の例外は中身を見せない。 */
function respond_(fn) {
  try {
    return { ok: true, data: fn() }
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: { code: e.code, message: e.message } }
    console.error(e && e.stack ? e.stack : e)
    return { ok: false, error: { code: "internal", message: "処理に失敗しました。もう一度お試しください。" } }
  }
}
