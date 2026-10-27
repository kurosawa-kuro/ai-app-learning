/** P1 / G1 の準備確認だけを行う。画像作成・推論・共有変更はしない。 */
const IntegrationSetup = {
  checkDrive() {
    const folderId = IntegrationSettings.photoFolderId()
    if (!folderId) return { ok: false, code: "missing_folder_id", message: "Script Properties に PHOTO_FOLDER_ID を設定してください。" }
    try {
      const folder = DriveApp.getFolderById(folderId)
      const owner = folder.getOwner()
      const account = Session.getEffectiveUser().getEmail()
      const ownerEmail = owner ? owner.getEmail() : ""
      const privateAccess = folder.getSharingAccess() === DriveApp.Access.PRIVATE
      const noOtherUsers = folder.getEditors().length === 0 && folder.getViewers().length === 0
      const ownerMatches = Boolean(account && ownerEmail && account === ownerEmail)
      const ready = !folder.isTrashed() && privateAccess && noOtherUsers && ownerMatches
      return {
        ok: ready,
        code: ready ? "drive_read_verified" : "review_folder_access",
        folderId,
        folderName: folder.getName(),
        effectiveAccount: account,
        ownerAccount: ownerEmail,
        ownerMatches,
        privateAccess,
        noOtherUsers,
        writeVerified: false,
        message: ready ? "保存先の読取と所有者・共有状態を確認しました。画像の書込はまだ未検証です。" : "所有者・共有状態をDrive画面でも確認してください。",
      }
    } catch (_error) {
      return { ok: false, code: "drive_access_failed", message: "保存先を確認できません。フォルダIDと実行アカウント・Drive承認を確認してください。" }
    }
  },

  checkGemini() {
    const configured = IntegrationSettings.geminiKeyConfigured()
    return {
      ok: configured,
      code: configured ? "key_configured_not_validated" : "missing_api_key",
      keyConfigured: configured,
      apiAuthenticationVerified: false,
      inferenceExecuted: false,
      message: configured ? "APIキーの設定有無だけ確認しました。有効性・プロジェクト・課金・推論は未確認です。" : "Script Properties に GEMINI_API_KEY を設定してください。キーをチャットやログへ貼らないでください。",
    }
  },
}
