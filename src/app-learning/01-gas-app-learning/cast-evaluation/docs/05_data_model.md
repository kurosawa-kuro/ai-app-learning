# Create／Read版のデータ設計

| シート | 列（順序固定） | 関係・制約 |
|---|---|---|
| members | id, name, active, created_at | 名前1〜60字。アプリからの追加はactive=true |
| daily_records | id, member_id, business_date, drinks, bottles, nominations, accompaniments, sales, created_at | membersへの参照。1人1営業日1行。数量0〜100万、売上0〜10億円の整数 |
| evaluation_rules | category, unit, points, enabled | DRINK/BOTTLE/NOMINATION/ACCOMPANIMENT/SALESの各1行。unitは正数、pointsは0以上、いずれも小数2桁まで |

評価結果は保存しない。現在の配点で月合計から計算する。数量は `月合計 × points / unit`、売上は `floor(月合計 / unit) × points`。表示は小数2桁、順位は計算値→売上の降順。同点同売上は1・1・3位。同順位内は名前・IDで表示順を固定する。数量4項目は有効、売上配点は初期無効。日付は2000〜2100年の暦日。ルール変更で過去の月も再計算される。

営業日の自動判定・締め処理は持たず、入力者が日付を指定する。旧案のACTIVE/INACTIVEはCR実装では文字列true/falseとし、状態変更画面は後続範囲。

## 保存方式

1シート＝1表。各列は文字列として保存し、読込み時に数量・価格・配点を検証して数値化する。日付もYYYY-MM-DDの文字列。Sheetsの自動日付変換・表示桁区切りによるズレを避ける。`setRichTextValues`で名称が`=`から始まっても数式として実行しない。文字列の数値列へSUMをそのまま使う教材ではなく、アプリ側で集計する設計。

初期化はアプリごとに新しいSheetsから行い、APP_SPREADSHEET_IDとAPP_KINDをScript Propertiesへ保存する。再実行は列の検査のみ。列が違う・表が消えた場合は停止し、データを再作成しない。IDは行番号に依存しない。

[Range公式仕様](https://developers.google.com/apps-script/reference/spreadsheet/range#setRichTextValues(RichTextValue))を2026-10-28に確認。実Sheetsでの保存受入は未実施。
