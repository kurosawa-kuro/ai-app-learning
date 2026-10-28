function createTagManagementApplication_(ports) {
  return {
    list() {
      ports.database.ensureIfNeeded()
      return ports.tags.usage()
    },
    change(input) {
      return ports.lock(() => {
        ports.database.ensure()
        const rows = ports.tags.usage(),
          action = input && input.action
        if (!["create", "rename", "delete"].includes(action))
          throw new AppError("invalid", "操作を選んでください。")
        const tag = rows.find((t) => t.id === input.id)
        if (action !== "create" && !tag)
          throw new AppError("not_found", "タグが見つかりません。")
        if (action === "delete") {
          if (tag.used)
            throw new AppError("in_use", "使われているタグは削除できません。")
          ports.tags.remove(tag.id)
          return { id: tag.id, deleted: true }
        }
        const name = String(input.name || "").trim()
        if (!name || name.length > 30)
          throw new AppError("invalid", "タグ名は1〜30文字で入力してください。")
        const same = rows.find((t) => t.name === name)
        if (same) {
          if (action === "create" || same.id === input.id) return same
          throw new AppError("conflict", "同じ名前のタグがあります。")
        }
        return action === "create"
          ? ports.tags.insert({ id: ports.ids.next(), name })
          : ports.tags.rename(tag.id, name)
      })
    },
  }
}
