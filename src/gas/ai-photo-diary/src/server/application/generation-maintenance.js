/** AI生成履歴の手動整理。外部操作は注入されたportsを通す。 */
function createGenerationMaintenanceApplication_(ports) {
  return {
    candidates() {
      const now = ports.clock.now()
      return ports.generations
        .list()
        .filter((r) => GenerationPolicy.canPurge(r.state, r.created_at, now))
        .map((r) => ({ id: r.id, state: r.state, createdAt: ports.formatDate(r.created_at) }))
    },
    purge(id) {
      return ports.lock(() => {
        const row = ports.generations.find(id)
        if (row && ["succeeded_purged", "failed_purged"].includes(row.state)) {
          ports.generations.removeAssetReferences(id)
          return { purged: true }
        }
        if (!this.candidates().some((r) => r.id === id))
          throw new AppError("in_use", "実行中または保持期間内の履歴は整理できません。")
        ports.generations.update(id, {
          state: row.state === "succeeded" ? "succeeded_purged" : "failed_purged",
          input_snapshot_json: "",
          output_title: "",
          output_body: "",
          usage_json: "",
          error_code: "",
        })
        ports.generations.removeAssetReferences(id)
        return { purged: true }
      })
    },
    inspect() {
      return ports.generations
        .list()
        .filter((r) => ["pending", "running", "unknown"].includes(r.state))
        .map((r) => ({ id: r.id, state: r.state, updatedAt: ports.formatDate(r.updated_at) }))
    },
    abandon(id) {
      return ports.lock(() => {
        const row = ports.generations.find(id)
        if (!row || !GenerationPolicy.canAbandon(row.state, row.updated_at, ports.clock.now()))
          throw new AppError("in_use", "実行中の可能性があるため中止できません。")
        ports.generations.update(id, { state: "failed", error_code: "manually_abandoned" })
        return { abandoned: true }
      })
    },
  }
}
