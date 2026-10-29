# photo-diary

> 2026-10-29：思想別UIUX改善を本人限定@21へ公開更新。単体・ローカル操作受入と公開コードの一致は確認済み、今回の実GAS画面操作は接続待ち。[最新の改善・受入記録](../../docs/tasks/gas-uiux-20261029.md)。以下の過去の版番号・実操作記録とは区別する。

> 2026-10-28：AIはOpenAI APIキー方式へ変更。OAuth／GCP設定は不要です。現在の手順は[OpenAI接続](docs/openai-setup.md)、実環境の進捗は[受入記録](../../docs/tasks/gas-release-20261028.md)を参照。過去のGemini連携仕様は旧方式の記録です。

Google Apps Script・Google Sheets・Drive・OpenAIで動く、本人専用の写真日記アプリです。写真とキーワードからAI下書きを作り、手直しして保存できます。一覧・複数タグOR絞り込み・詳細表示、タグ管理・日付入力、最大3枚の写真、未添付画像と生成履歴の手動整理に対応しています。保存済み日記の編集・削除、独自ログインは対象外です。

## 現在地と検証範囲

2026-10-28時点。DBは`v2_`接頭辞の10表、主要業務はDomain / Application / アダプターに分離しています。

| 対象 | 確認できていること |
|---|---|
| 既存公開環境 | [移行記録](docs/tasks/03_active/本番DBv2移行_2026-10-25.md)ではDB v2移行・画像検証・公開版@18への更新が完了。その後2026-10-28に本人限定@20へ更新し、日付列追加・既存6件保持・実OpenAI画像下書き・保存・再表示を確認済み |
| 最新のローカル修正 | 保存先・起動JSON・書込確定・文字列保存の修正に加え、画像一覧の一括読取と手動編集時のキャッシュ失効競合を修正。78ファイルpush済み。日付列追加と公開版@20への更新も完了 |
| 直近のローカル検証 | `npm run check`で162件成功とAI要求構築4ケース成功。実ChromiumでPC幅・スマホ幅の操作・50件ずつの追加表示・画像表示を確認。GAS・Drive・OpenAI通信は模擬 |
| 残る受入 | キー再発行と最終受入記録の未確認項目（公開@20、日付列追加・OpenAI画像下書き・保存・再表示は確認済み） |

日付・タグ・入力上限の仕様は[基本機能の対応](docs/specs/gas-baseline.md)。配置と残作業は[5教材の実行記録](../../docs/tasks/gas-release-20261028.md)。

テスト件数と版番号は上記日時の記録です。ローカル成功を実環境の動作保証として扱わず、公開時に[Runbook](docs/08_release_runbook.md)で確認します。

## ローカル開発

Node.js 20以上を使用し、以下はプロジェクトの`src/`で実行します。

```powershell
npm ci
npm run check
npx playwright install chromium
npm run test:browser
```

| コマンド | 用途 |
|---|---|
| `npm run build:data` | `env/`の設定・タグ・サンプル・文体から生成物を更新 |
| `npm run check` | 生成物の一致、全テスト、外部送信なしのAI要求構築を検証 |
| `npm test` | 生成物を更新して全テストを実行 |
| `npm run test:browser` | 実Chromium・模擬GASで画面と画像処理を検証 |
| `npx clasp show-file-status` | GASへ送るファイルを確認 |
| `npm run push` | データ生成後に`clasp push --force`。テスト・公開版更新は代行しない |
| `npm run deploy` | 設定済みの既存デプロイを更新。build・test・pushは代行しない |

生成物の不一致は`npm run build:data`後に差分を確認します。Makefileはテンプレートで、lint・formatter・開発サーバーのnpm scriptはありません。計測や外部API検証は[スクリプト運用ガイド](src/scripts/README.md)を参照してください。

## GASへの配置・更新

公開設定は`MYSELF / USER_DEPLOYING / Asia/Tokyo / V8`です。接続先は`src/.clasp.json`と`src/package.json`で照合します。既存URLの更新ではデプロイIDを維持してください。

1. ローカル検証後、`npx clasp show-file-status`でmanifest・server JS・client HTMLのみが対象であることを確認し、pushする。
2. **今回の修正を初めて反映するときは、公開版を更新する前に保存先を登録する。** 対象SheetsからApps Scriptエディタを開き、`bindDatabaseSpreadsheet`を実行する。`DIARY_SPREADSHEET_ID`とキャッシュ世代だけを登録し、業務表は変更しない。
3. 既存Sheetsをコピー保存し、`upgradeDiaryEntryDate`で日記の末尾に日付列を追加する。旧行・旧5列を変更しない。列追加後は既存デプロイを速やかに更新する。
4. `inspectApplicationSetup`と公開URLで保存・画像・AI・タグを受入確認する。

保存先未登録は`setup_required`、既存登録先との不一致は`setup_conflict`で停止します。認証、スタンドアロンGASでの登録、新規初期化、旧版移行、復旧は[Runbook](docs/08_release_runbook.md)を参照してください。既存v2環境の保存先登録のためにDBを初期化し直す必要はありません。

設定済みの[公開URL](https://script.google.com/macros/s/AKfycbxheV06EzeMBitwdmIcYCjLAZXMuhxiF_dRc2N0XvcrKztDNwucPnnBZn0iM6ISf9SaKg/exec)は、pushだけでは更新されません。

## データと変更箇所

| 場所 | 役割 |
|---|---|
| `env/` | 非機密設定、タグ、初期データ、AI文体。生成物を直接編集しない |
| `src/server/domain/`・`application/`・`bootstrap/` | 業務判断、処理手順、依存の組立 |
| `src/server/services/`・`models/`・`db/` | 互換窓口・外部サービス、集約、Sheets操作とキャッシュ |
| `src/server/controllers/`・`presenters/` | 公開入口、HTML配信、画面向け変換 |
| `src/client/` | HTML Serviceの画面。通信・履歴・描画の共通部品とadmin-pico |
| `src/tests/`・`docs/` | 回帰検証、確定仕様、運用手順、作業記録 |

日記・画像資産・添付・要求履歴を分離し、保存要求IDと内容を永続照合します。キャッシュは高速化用です。新規環境だけを初期化し、旧表や`books`を自動削除せず、有効化済みDBの欠損表も自動再作成しません。設定変更やシート削除をデータの再投入手段にしないでください。

表示にはキャッシュ、更新判断にはfresh読取を使います。`onEdit`で失効しますが、シート削除では発火せず最大6時間古い表示が残り得ます。秘密は実行時のScript Propertiesで管理し、Git除外済みの`env/secret.yaml`からの自動同期はありません。

## 次に読む文書

- [文書索引](docs/00_index.md)：確定仕様と作業記録の案内。
- [DB v2仕様](docs/specs/database-v2.md)・[Domain / Application設計](docs/specs/application-domain-architecture.md)：データと責務の正本。
- [写真・OpenAI連携](docs/specs/photo-gemini-integration.md)・[運用診断](docs/specs/setup-operations.md)：設定、生成、整理、障害調査。
- [AGENTS.md](AGENTS.md)：開発時の共通規約と再発防止。[CLAUDE.md](CLAUDE.md)：Claude Codeの入口。
- [タスク索引](docs/tasks/README.md)：経緯・残作業。過去の構想を現在の実装と混同しない。

出発点は`joshm21/apps-script-crud-template`（MIT）。admin-picoの出どころ・利用条件は`src/client/vendor/admin-pico/`を参照してください。Pico CSSはCDNから読み込み、`src/package.json`のlicenseは`ISC`です。
