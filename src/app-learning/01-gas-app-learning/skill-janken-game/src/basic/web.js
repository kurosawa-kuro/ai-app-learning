function doGet() {
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle(APP.title)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
function initializeApp() {
  return Store.initialize();
}
function rpc(operation, input) {
  try {
    require_(
      typeof operation === "string" &&
        Object.prototype.hasOwnProperty.call(Operations, operation),
      "この操作は利用できません。",
    );
    require_(
      input == null || (typeof input === "object" && !Array.isArray(input)),
      "入力内容を確認してください。",
    );
    return {
      ok: true,
      data: locked_(() => Operations[operation](input || {})),
    };
  } catch (error) {
    return {
      ok: false,
      error: error.userFacing
        ? error.message
        : "保存・読込できませんでした。入力を残しています。同じ内容で再試行してください。",
    };
  }
}
