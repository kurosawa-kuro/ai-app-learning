# 06 エラー方針

業務 API は respond_ を通し、成功時は `{ ok: true, data }`、失敗時は `{ ok: false, error: { code, message } }` を返す。画面は App.api が Promise の成功・失敗として扱う。

## 分類と対応

| code / 事象 | 発生例 | 対応 |
|---|---|---|
| invalid | 必須項目・文字数・選択 ID・参照先が不正 | 利用者向けの文言を表示し、入力修正や再読込を促す |
| not_found | 指定した日記・タグが見つからない | 見つからない旨を表示し、一覧や選択を確認する |
| busy | 書き込みロックの待機時間を超過 | 少し待って再試行する |
| internal | 想定外のサーバー例外、応答の異常 | 詳細を画面へ出さず、汎用メッセージを表示する |
| network | google.script.run の failure handler | 通信状態を確認して再試行する |
| 生成時の ENOENT | build-data が旧 data/config.yaml を参照 | 入力パスを修復する。画面の通信エラーとは区別する |

## 再試行と保存

App.api は呼び出しを Promise 化し、無条件の自動再試行はしない。保存結果が不明な場合は一覧を確認し、requestId の二重登録防止を維持する。キャッシュ失効後や新しい requestId では再登録の可能性があり、無制限の冪等性は保証しない。

入力検証は書き込み前に完了させる。ロックは finally で解放する。複数シートへの書き込み途中で失敗した場合、データのロールバックを保証せず、親子行の整合を確認する。

## ログと公開時の確認

想定外の例外は respond_ が console.error に記録する。manifest の exceptionLogging は STACKDRIVER。秘密情報・トークン・認証情報をログに追加しない。初期 HTML 配信の失敗と、配信後の業務 API のエラーを区別する。

障害報告には操作、対象画面、発生条件、返った code、検証範囲を残す。回帰検証は [07](07_test_strategy.md)、公開後の復旧判断は [08](08_release_runbook.md) に従う。
