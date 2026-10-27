# Change Boundary — photo-diary

共通規約は [AGENTS.md](../../AGENTS.md)。変更対象はユーザーの依頼に合わせ、責務とデータへの影響を確認する。

| 対象 | 変更時の約束 |
|---|---|
| src/server/controllers・services・models・presenters・db | MVC の責務を維持。シート操作は SheetStore、入力検証は書き込み前 |
| src/client/core・views | 通信・履歴・画面責務を分け、フォーム値は .value で設定 |
| src/client/vendor/admin-pico/admin-theme.html | UI の色の正本。配色変更はコントラスト検証と組にする |
| env/config.yaml・sample-data.yaml・tags.csv | 設定・マスターの実ファイル。シート既存行への自動反映とは区別 |
| src/server/config/generated.js | 直接編集せず生成する。入力元は env/ |
| src/server/db/tables.js・seeder.js | 列順、関連行、初期化時の廃止シート削除への影響を確認 |
| src/.clasp.json・.claspignore・appsscript.json・package.json | 接続先・送信範囲・公開権限・既存デプロイ ID を維持 |
| src/tests/ | 検証意図を維持し、実装に合わせて弱めない |
| docs/ | 基準3文書に合わせ、履歴・構想・現状の記述を区別 |
| .claude/ | Claude 固有の integration。docs の編集を設定変更と扱わない |

秘密情報・認証ファイルを文書や生成物に含めない。現状 .git は存在せず、依頼されていない初期化をしない。依存の更新や他の機能追加を便乗させない。

シート削除・公開範囲変更・新しい外部 API など、依頼に含まれない影響が必要になった場合は対象と理由を示して範囲を確認する。既に依頼された可逆な文書・実装調整に、正本文書という理由だけで追加承認を求めない。

hook の保護パスと permissions は実際の設定を別途確認する。この文書は hook が特定パスで停止することを検証した一覧ではなく、docs 更新で強制設定は変更しない。操作の境界は [capability-boundary.md](capability-boundary.md) を参照する。
