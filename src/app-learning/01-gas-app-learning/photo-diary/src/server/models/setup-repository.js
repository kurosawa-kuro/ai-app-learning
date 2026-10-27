/** 運用診断の読取専用projection。本文・入力snapshotを返さない。 */
const SetupRepository = {
  inspect() {
    const legacyTables = SheetStore.existingSheets(Object.keys(LEGACY_TABLES))
    const tables = Object.keys(TABLES).map((name) => {
      if (!SheetStore.sheet(name)) return { name, state: "missing", rows: 0 }
      try {
        return { name, state: "ready", rows: SheetStore.readFresh(name).length }
      } catch (error) {
        return {
          name,
          state: error instanceof AppError && error.code === "schema_mismatch" ? "schema_mismatch" : "read_failed",
        }
      }
    })
    let migration = null
    if (tables.some((t) => t.name === "schema_migrations" && t.state === "ready")) {
      const row = SheetStore.readFresh("schema_migrations").find((r) => r.version === "2")
      if (row) migration = { version: row.version, name: row.name, state: row.state, checkpoint: row.checkpoint }
    }
    return { legacyTables, tables, migration }
  },
  pendingSaves() {
    const posts = new Set(SheetStore.readFresh("posts").map((r) => r.id))
    return SheetStore.readFresh("post_create_requests")
      .filter((r) => ["pending", "legacy_pending"].includes(r.state))
      .map((r) => ({
        requestId: r.request_id,
        postId: r.post_id,
        state: r.state,
        parentExists: posts.has(r.post_id),
        updatedAt: isoDateTime_(r.updated_at),
      }))
  },
  measureTable(name) {
    const started = Date.now(),
      rows = SheetStore.readFresh(name)
    const readMs = Date.now() - started
    const serializedBytes = utf8Bytes_(JSON.stringify(rows, encodeDate_))
    return { name, rows: rows.length, readMs, serializedBytes, cacheEligible: serializedBytes <= TableCache.MAX_BYTES }
  },
}
