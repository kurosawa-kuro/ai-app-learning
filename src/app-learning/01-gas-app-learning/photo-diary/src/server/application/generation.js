/** AI生成の予約・実行・結果保存。外部操作は注入されたportsを通す。 */
function createGenerationApplication_(ports) {
  return {
    providers_: () => ports.providers(),
    provider_() {
      const p = this.providers_()[ports.settings.providers().draft]
      if (!p) throw new Error("AI提供元の設定がありません")
      return p
    },
    generate(input) {
      const source = input || {},
        requestId = requireRequestId_(source.requestId)
      const prepared = ports.lock(() => {
        ports.database.ensure()
        const imageIds = uniqueStrings_(source.imageIds, "写真").map((id) => ports.photos.assetId(id))
        const tagIds = uniqueStrings_(source.tagIds, "キーワード").sort()
        const inputHash = ports.hash({ version: 2, imageIds, tagIds, consent: source.aiConsent === true })
        const existing = ports.generations.findRequest(requestId)
        if (existing) {
          if (existing.input_hash !== inputHash)
            throw new AppError("request_conflict", "同じ生成要求の入力が変更されています。")
          if (existing.state === "succeeded") return { cached: ports.generations.result(existing) }
          if (GenerationPolicy.isInterrupted(existing.state, existing.updated_at, ports.clock.now()))
            ports.generations.update(existing.id, { state: "unknown", error_code: "interrupted" })
          throw new AppError(
            "generation_" + (existing.state === "running" ? "pending" : existing.state),
            "この要求は再送で生成しません。状態を確認し、新しく生成してください。"
          )
        }
        const tagsById = new Map(ports.tags.fresh().map((t) => [t.id, t]))
        ports.validation.photoIds(imageIds)
        ports.validation.tagIds(tagIds, tagsById)
        if (!imageIds.length && !tagIds.length)
          throw new AppError("invalid", "写真かキーワードを1つ以上選んでください。")
        const provider = this.provider_(),
          name = ports.settings.providers().draft
        if (name === "openai" && source.aiConsent !== true)
          throw new AppError("consent_required", "OpenAIへ送る内容を確認してください。")
        ports.photos.validateAttachment(imageIds)
        const assets = imageIds.map((id) => ports.assets.find(id, true)),
          tags = tagIds.map((id) => tagsById.get(id))
        if (name === "openai" && !tags.length && !assets.some((a) => a.storage_kind === "drive"))
          throw new AppError("invalid", "キーワードかアップロードした写真を選んでください。")
        const now = ports.clock.date(),
          id = ports.ids.next()
        const snapshot = {
          version: 2,
          tags,
          preferences: ports.settings.diaryPreferences(),
          model: ports.settings.ai().model,
          maxOutputTokens: ports.settings.ai().maxOutputTokens,
          limits: ports.settings.limits(),
          promptTemplate: name === "openai" ? provider.promptTemplate() : "mock-v1",
        }
        const json = JSON.stringify(snapshot)
        if (utf8Bytes_(json) > 24000) throw new AppError("invalid", "生成入力が長すぎます。")
        ports.generations.insert(
          {
            id,
            request_id: requestId,
            input_hash: inputHash,
            provider: name,
            model: name === "mock" ? "" : snapshot.model,
            prompt_version: "diary-v2",
            input_snapshot_json: json,
            state: "pending",
            created_at: now,
            updated_at: now,
            consent_at: name === "openai" ? now : "",
            consent_version: name === "openai" ? "2026-10-24" : "",
          },
          assets
        )
        ports.generations.update(id, { state: "running" })
        return {
          id,
          provider,
          snapshot,
          photos: imageIds.map((id) => ports.photos.view(id)),
          tags,
          consent: source.aiConsent === true,
        }
      })
      if (prepared.cached) return prepared.cached
      let draft
      try {
        draft = prepared.provider.generate(prepared)
        GenerationPolicy.validateOutput(draft, prepared.snapshot.limits)
      } catch (error) {
        const failure = GenerationPolicy.failure(error)
        ports.lock(() =>
          ports.generations.update(prepared.id, {
            state: failure.state,
            error_code: failure.code,
          })
        )
        throw error
      }
      // 結果保存失敗はrunningのまま。外部処理を自動再実行しない。
      return ports.lock(() => {
        const row = ports.generations.find(prepared.id)
        if (!row || row.state !== "running") throw new AppError("generation_unknown", "生成状態を確認してください。")
        ports.generations.update(prepared.id, {
          state: "succeeded",
          output_title: draft.title.trim(),
          output_body: draft.body.trim(),
          usage_json: JSON.stringify(draft.usage || {}),
          elapsed_ms: draft.elapsedMs == null ? "" : draft.elapsedMs,
        })
        return {
          title: draft.title.trim(),
          body: draft.body.trim(),
          mock: Boolean(draft.mock),
          generationId: prepared.id,
        }
      })
    },
  }
}
