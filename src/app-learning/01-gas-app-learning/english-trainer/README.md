# english-trainer

> 2026-10-28：AIはOpenAI APIキー方式へ変更。OAuth／GCP設定は不要です。現在の手順は[OpenAI接続](docs/openai-setup.md)、実環境の進捗は[受入記録](../../docs/tasks/gas-release-20261028.md)を参照。過去のGemini連携仕様は旧方式の記録です。

GAS・Google Sheets・OpenAIで動く、個人用の英語訓練アプリです。自由記述クイズのAI採点、短い自由会話、振り返り、学習記録を基本導線とします。[基本配布範囲](docs/specs/educational-baseline.md)を正本とし、旧G3の能力一覧・候補承認・再学習リセットを基本画面へ並べません。

配布モデルA（1人1コピー・本人限定公開・各自のOpenAIキー）。永続化はSheets、秘密はScript Properties。音声入出力・関係DB・自動計画は対象外です。既存の教材・履歴・再送処理は保持します。

## 現在地と検証範囲

2026-10-28：`npm run check`で76件成功、生成物と整形確認も成功。PlaywrightでPC1440px／スマホ390pxの基本操作・履歴・失敗後の入力保持を確認し、スクショを目視しました。GASへ31ファイルをpushし、本人限定@3へ更新しています。**初期化・OpenAI実採点／会話／振り返り／履歴・再読込・PC／スマホは確認済み。キー再発行の進捗は下記記録を参照**。進捗・配置URLは[5教材の実行記録](../../docs/tasks/gas-release-20261028.md)。

ローカルは実Chromiumと模擬GAS／OpenAIです。GAS配置時に検出した未対応構文を直しましたが、配置成功だけで実画面の保存やAI応答まで確認できたとは扱いません。

## ローカル開発

Node.js 22以降を使用し、以下はプロジェクトの`src/`で実行します。

```powershell
npm ci
npm run build:data
npm run check
npx playwright install chromium
npm run test:browser
```

`npm run check`は生成物の一致・全テスト・Prettier確認、`npm run test:browser`は実Chromium・模擬通信での画面検証です。env変更後は`npm run build:data`と差分確認を行います。Makefileはテンプレートです。

## 利用開始・配布

1. 自分用のSheetsに紐付くGASへコードを配置する。接続先の設定・認証・送信対象の確認は[配置と受入手順](docs/08_release_runbook.md)に従う。
2. Sheetsの「英語訓練 → 初期設定」、またはGASエディタの`initializeTrainer`を実行する。教材と保存先`ET_SPREADSHEET_ID`を登録する。
3. 自分として実行・本人だけがアクセスできるWebアプリとしてデプロイし、設定画面で自分のキーを登録してAIを有効化する。初期値はAIオフ・30回/日。
4. 実AI採点・会話・同ID再送・コピー先での初期設定を受入確認してから配布する。

コピー先も初期設定・本人限定デプロイ・キー登録が必要です。コピーだけで準備が完了するとは扱いません。利用済みのキーや学習記録を含むファイルは配布しないでください。アプリの日次回数制限はGoogle側の課金停止機能ではありません。

`npm run push`は検証とコード配置までで、Webアプリの公開版更新は別操作です。既存環境の更新・バックアップ・欠損時の復旧もRunbookに従います。

## データと変更箇所

| 場所 | 役割 |
|---|---|
| `src/server/` | Domain、Application、依存の組立、Sheets、OpenAIアダプター |
| `src/client/` | HTML Serviceの5タブ画面 |
| `env/config.yaml` | 非機密の初期設定 |
| `env/expressions/` | 初期教材51件。利用開始後の教材正本は`et_expressions`シート |
| `src/tests/` | 業務・障害復旧・GAS制約・画面の回帰検証 |
| `docs/` | 製品方針、現行仕様、運用、作業記録 |

教材を変えても過去回答は保存時の版で扱います。要求IDと内容を照合し、成功済みAI結果を再利用します。結果不明の要求を自動再送して推論を重複させません。復旧条件は[G3仕様](docs/specs/gas-trainer-v1.md)を参照してください。

移植元の`sample/`はユーザー指示で削除済みです。必要な教材・処理は`env/`・`src/`に保持し、旧資料はGit履歴から参照します。ローカル秘密ファイルやDoppler設定を、Script Propertiesへの同期済みの証拠として扱わないでください。

## 次に読む文書

- [文書索引](docs/00_index.md)：製品構想と現行仕様の区別。
- [G3仕様](docs/specs/gas-trainer-v1.md)・[データモデル](docs/05_data_model.md)：実装範囲・状態遷移・参照元との差分。
- [テスト方針](docs/07_test_strategy.md)・[配置と受入](docs/08_release_runbook.md)：検証と運用。
- [AGENTS.md](AGENTS.md)：共通規約と再発防止。[CLAUDE.md](CLAUDE.md)：Claude Codeの入口。
