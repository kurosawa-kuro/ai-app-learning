/**
 * シートへの書き込みを直列にするロック。書き込みはすべてこの中で行う。
 */
function withLock_(fn) {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(Settings.lockWaitMs())) throw new AppError("busy", "混み合っています。少し待ってからもう一度お試しください。")
  try {
    return fn()
  } finally {
    // 途中で例外が発生しても、保留中の書込を排他区間内で確定する。
    try {
      SheetStore.flush()
    } finally {
      lock.releaseLock()
    }
  }
}
