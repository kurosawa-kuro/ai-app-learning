/** 共通のSheets境界。ScriptLock内で使用し、既存行を上書きしない。 */
const Store = {
  spreadsheet() {
    const props = PropertiesService.getScriptProperties();
    const id = props.getProperty("APP_SPREADSHEET_ID");
    require_(
      id && props.getProperty("APP_KIND") === APP.kind,
      "GASエディタでinitializeAppを実行してください。",
    );
    return SpreadsheetApp.openById(id);
  },
  sheet(name, book) {
    require_(
      Object.prototype.hasOwnProperty.call(APP.tables, name),
      "保存先の定義を確認してください。",
    );
    const sheet = (book || this.spreadsheet()).getSheetByName(name);
    require_(
      sheet,
      "必要なシートがありません。初期化し直さず、保存先を確認してください。",
    );
    const header = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0];
    require_(
      JSON.stringify(header) === JSON.stringify(APP.tables[name]),
      "シートの列が仕様と異なります。データを保持して列を確認してください。",
    );
    return sheet;
  },
  read(name, book) {
    const sheet = this.sheet(name, book),
      columns = APP.tables[name];
    if (sheet.getLastRow() < 2) return [];
    return sheet
      .getRange(2, 1, sheet.getLastRow() - 1, columns.length)
      .getDisplayValues()
      .filter((row) => row.some((value) => value !== ""))
      .map((row) => Object.fromEntries(columns.map((key, i) => [key, row[i]])));
  },
  write(sheet, start, rows) {
    if (!rows.length) return;
    if (start + rows.length - 1 > sheet.getMaxRows())
      sheet.insertRowsAfter(
        sheet.getMaxRows(),
        start + rows.length - 1 - sheet.getMaxRows(),
      );
    const range = sheet.getRange(start, 1, rows.length, rows[0].length);
    range.setNumberFormat("@");
    // 文字列として確定。=等で始まる名称も数式として実行しない。
    range.setRichTextValues(
      rows.map((row) =>
        row.map((value) =>
          SpreadsheetApp.newRichTextValue().setText(String(value)).build(),
        ),
      ),
    );
    SpreadsheetApp.flush();
  },
  append(name, rows, book) {
    const sheet = this.sheet(name, book);
    this.write(
      sheet,
      sheet.getLastRow() + 1,
      rows.map((row) =>
        APP.tables[name].map((key) => (row[key] == null ? "" : row[key])),
      ),
    );
  },
  initialize() {
    return locked_(() => {
      const book = SpreadsheetApp.getActiveSpreadsheet(),
        props = PropertiesService.getScriptProperties();
      require_(
        book,
        "保存先Sheetsから拡張機能→Apps Scriptを開いて実行してください。",
      );
      const existing = props.getProperty("APP_SPREADSHEET_ID");
      require_(
        !existing || existing === book.getId(),
        "登録済みの保存先と異なります。既存設定を変更せず停止しました。",
      );
      require_(
        !props.getProperty("APP_KIND") ||
          props.getProperty("APP_KIND") === APP.kind,
        "別アプリの設定が存在します。別のSheetsを使ってください。",
      );
      // 既に利用開始した環境は検査だけ。消された表・サンプルを自動再作成しない。
      if (existing) {
        Object.keys(APP.tables).forEach((name) => this.sheet(name, book));
        return "設定済みです。既存データは変更していません。";
      }
      Object.entries(APP.tables).forEach(([name, columns]) => {
        let sheet = book.getSheetByName(name);
        if (!sheet) sheet = book.insertSheet(name);
        if (!sheet.getLastRow()) {
          this.write(sheet, 1, [columns]);
          sheet.setFrozenRows(1);
        }
        this.sheet(name, book);
        const present = new Set(
          this.read(name, book).map((row) => row[columns[0]]),
        );
        this.append(
          name,
          (APP.seed[name] || []).filter(
            (row) => !present.has(String(row[columns[0]])),
          ),
          book,
        );
      });
      props.setProperty("APP_KIND", APP.kind);
      props.setProperty("APP_SPREADSHEET_ID", book.getId());
      return "初期設定が完了しました。本人限定でWebアプリを公開してください。";
    });
  },
};
function locked_(work) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("処理が混み合っています。");
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}
function require_(condition, message) {
  if (!condition) {
    const e = new Error(message);
    e.userFacing = true;
    throw e;
  }
}
function text_(value, max, label) {
  require_(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= max,
    label + "を1〜" + max + "文字で入力してください。",
  );
  return value.trim();
}
function int_(value, max, label) {
  require_(
    /^(0|[1-9][0-9]*)$/.test(String(value)) &&
      Number.isSafeInteger(Number(value)) &&
      Number(value) <= max,
    label + "は0〜" + max + "の整数です。",
  );
  return Number(value);
}
function requestId_(id) {
  require_(
    typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      ),
    "画面を読み直して送信してください。",
  );
  return id;
}
function hash_(value) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(value),
    Utilities.Charset.UTF_8,
  )
    .map((b) => ("0" + ((b + 256) % 256).toString(16)).slice(-2))
    .join("");
}
function now_() {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
}
