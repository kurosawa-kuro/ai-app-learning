# Create／Read版のデータ設計

| シート | 列（順序固定） | 関係・制約 |
|---|---|---|
| users | id, name | 初期登録した架空の注文者。認証情報ではない |
| products | id, name, price, active | 価格0〜100万円の整数円、active=trueを表示 |
| orders | id, user_id, created_at, fingerprint | users 1 : 多 orders。IDは送信UUID、fingerprintは入力内容のSHA-256 |
| order_items | order_id, product_id, product_name, unit_price, quantity, fingerprint | orders 1 : 多 order_items。注文内で商品は重複不可、数量1〜99、最大20種類 |

商品名・単価は注文時点の値を保存する。合計は保存済み単価×数量の合計で、現在価格では再計算しない。初期商品3件、ユーザー2名。カテゴリー・中間表・ショップ表・カート表は持たない。

Sheetsにはトランザクションがないため、ScriptLock内で入力・参照・現在価格を検証し、明細→注文の順に追記する。注文行が存在するものだけ一覧へ出す。同じ送信IDと内容の再試行では保存済み明細を再利用し、不足行と注文行だけ追加する。注文行の保存後に応答を失った場合も同じ注文を返す。別の内容で同じIDを使う要求は拒否する。

途中失敗の同じ要求IDは開いている画面内だけ保持する。画面を閉じてIDを失った場合の自動復旧は対象外。未確定明細が残り得るため、教材用データで利用し、旧行を黙って削除・確定しない。実運用用の復旧管理機能は追加しない。

## 保存方式

1シート＝1表。各列は文字列として保存し、読込み時に数量・価格・配点を検証して数値化する。日付もYYYY-MM-DDの文字列。Sheetsの自動日付変換・表示桁区切りによるズレを避ける。`setRichTextValues`で名称が`=`から始まっても数式として実行しない。文字列の数値列へSUMをそのまま使う教材ではなく、アプリ側で集計する設計。

初期化はアプリごとに新しいSheetsから行い、APP_SPREADSHEET_IDとAPP_KINDをScript Propertiesへ保存する。再実行は列の検査のみ。列が違う・表が消えた場合は停止し、データを再作成しない。IDは行番号に依存しない。

[Range公式仕様](https://developers.google.com/apps-script/reference/spreadsheet/range#setRichTextValues(RichTextValue))を2026-10-28に確認。実GAS画面からの保存・再読込は確認済み。Sheets行・型との直接照合は未確認。
