/** AI生成の状態・出力・保持期限。I/Oを行わず、時刻は呼出元から受け取る。 */
const GenerationPolicy = {
  RETENTION_MS: 30 * 86400000,
  RUNNING_TIMEOUT_MS: 15 * 60000,
  canAdopt(state) {
    return ["succeeded", "succeeded_purged"].includes(state)
  },
  canPurge(state, createdAt, now) {
    return (
      ["succeeded", "failed"].includes(state) &&
      createdAt instanceof Date &&
      createdAt.getTime() < now - this.RETENTION_MS
    )
  },
  isInterrupted(state, updatedAt, now) {
    return state === "running" && now - updatedAt.getTime() > this.RUNNING_TIMEOUT_MS
  },
  canAbandon(state, updatedAt, now) {
    return ["pending", "running", "unknown"].includes(state) && now - updatedAt.getTime() >= this.RUNNING_TIMEOUT_MS
  },
  validateOutput(draft, limits) {
    if (
      !draft ||
      typeof draft.title !== "string" ||
      typeof draft.body !== "string" ||
      !draft.title.trim() ||
      !draft.body.trim() ||
      draft.title.length > limits.title ||
      draft.body.length > limits.body
    )
      throw new AppError("invalid_draft", "下書きの形式が正しくありません。")
  },
  failure(error) {
    return {
      state: error instanceof AppError && error.code !== "ai_unknown" ? "failed" : "unknown",
      code: error instanceof AppError ? error.code : "interrupted",
    }
  },
}
