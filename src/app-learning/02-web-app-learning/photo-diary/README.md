# photo-diary — Web版

コピー元：`../template`、基準コミット：`1e56304db211ec16d3dee971c093778ff81584b8`。
2026-10-27、固有編集前に412ファイルのSHA256一致を確認。
[コピー照合記録](../docs/tasks/copy-baseline-20261027.json)。除外：`.env`（秘密値）、`.local`（実データ・作業記録）、`node_modules`・`target`・`playwright-report`・`test-results`（再生成可能）。

開発DB：`photo_diary`、JavaテストDB：`photo_diary_test`（各統合試験は同接頭辞の専用DBスキーマ）、ポート：8091。画像バケット：`photo-diary-images-dev`。秘密値は複製していない。設定ひな形は`.env.example`。
コピー元の過去の検証・公開記録はこのアプリの完了を意味しない。教材固有の現在の範囲・起動・確認方法は[実装・検証記録](docs/lesson-implementation.md)を参照。入口は `/diary`。

---

## ローカル起動（共通の秘密値を参照する場合）

このディレクトリで `./run-local.ps1 -SecretsFile ../template/.env -Action run` を実行します。
DB・Storage・Geminiの秘密値だけをプロセスへ読み込みます。スキーマ・バケット・ポートはこのアプリ固有の設定を使います。`.env` をコピーする必要はありません。
AIは既定で固定応答（`APP_AI_MODE=demo`）。実接続の確認時だけ環境変数を `live` にします。固定応答と実接続の検証結果は分けて記録します。


# 教育用Webアプリスターター

一つの題材で、AIへ依頼し、動かし、結果を確認するためのSpring Bootアプリです。実務向け運用基盤の全部入りにはしません。

現在の範囲は[教育用の最小構成](docs/educational-baseline.md)。[過剰実装の失敗と再発防止](docs/education-scope-incident.md)を記録しています。

## できること

- 投稿の作成・編集・削除、検索、投稿者による絞込み、10件ずつのページャー。
- 画像の添付・差替え・解除・拡大。ユーザーアイコン。
- 投稿者の作成・名前編集・切替・デフォルト指定。ログイン機能はありません。
- 管理・設定で画像投稿／AIのON・OFF、AIモデル制限、CSV出力。
- Gemini疎通、本文と任意の画像から下書き生成、確認して反映／破棄。
- スキルじゃんけんのUI例。

## 起動

Java 17以降が必要です。Mavenは同梱Wrapperを使います。PlaywrightにはNode.jsが必要です。

1. `.env.example` を参考に `.env` へSupabase PostgreSQLのSession pooler接続値を設定します。
2. 画像を使う場合はSUPABASE_URL・SUPABASE_SECRET_KEY・SUPABASE_STORAGE_BUCKETを設定します。
3. AIを使う場合はGEMINI_API_KEYを設定します。接続情報だけでAIは実行されず、画面の許可・モデル制限・明示操作が必要です。
4. Git Bashで `./run-local.sh`、PowerShellで `.\run-local.ps1`。http://localhost:8080/posts を開きます。

`.env` の順番は「アプリ → DB → 画像 → Gemini → Render」。コメント内も含め、秘密値をGit・チャット・検証ログへ出しません。認証用の環境変数は不要です。

## デモデータと検証

```bash
./run-local.sh -Action seed-preview # 件数・追加予定の確認
./run-local.sh -Action seed         # 利用者データを残してサンプル追加
./run-local.sh -Action seed-images  # 既存サンプルへ未登録画像だけ追加
./run-local.sh -Action test
npx playwright test
./run-local.sh -Action stop -Port 8080
```

画像を使う場合は管理・設定で画像投稿を許可します。12投稿・3人・4画像、縦長／横長／正方形、長短文、2ページ目で表示を確認します。シードは開発スキーマだけに許可し、起動時に勝手に実行しません。

`seed-reset` は開発スキーマの全投稿を置換する破壊的操作です。通常は `seed` を使います。画像の削除失敗は `seed-cleanup` で再試行できます。バケット全体は削除しません。

## 構成と資料

- [仕様](テンプレート仕様.md)、[コード構成](docs/architecture.md)、[UI](docs/ui-foundation.md)
- [最小共通機能](docs/shared-foundation-requirements.md)、[現在の対応状況](docs/improvement-backlog.md)
- [Render公開](docs/render-deployment.md)、[作業用コマンド](docs/operations-runbook.md)
- [DB設計・移行条件](docs/database-design.md)
- [性能の測定記録](docs/performance-validation.md)

Pico CSS 2.1.1をMITライセンス付きで同梱します。admin-picoのレイアウト・部品はMavenから取り込みます。公開前に全CSSのHTTP200・text/css・スタイル適用を確認します。

学習者の入口はGAS → Web、提供者の制作順はローカル検証しやすいWeb → GASです。横展開のたびに運用機能を増やしません。
