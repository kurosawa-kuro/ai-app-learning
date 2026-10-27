/** 保存要求の再送と中止を管理する。 */
const RequestRepository = {
  find(id) {
    return SheetStore.readFresh("post_create_requests").find((r) => r.request_id === id)
  },
  reserve(requestId, postId, hash) {
    const now = new Date()
    SheetStore.append("post_create_requests", [
      {
        request_id: requestId,
        post_id: postId,
        payload_hash: hash,
        state: "pending",
        created_at: now,
        updated_at: now,
      },
    ])
  },
  update(id, values) {
    SheetStore.update("post_create_requests", id, { ...values, updated_at: new Date() })
  },
}
