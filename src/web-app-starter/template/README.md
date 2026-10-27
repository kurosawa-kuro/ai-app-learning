# Web App Template

認証なしで、投稿者と投稿の **User 1：Post 多** を試せるSpring Bootテンプレートです。画像添付は起動時に選べるオプションです。提供者が一つの題材でAIと改修・確認を繰り返す土台として使います。

## できること

- 投稿者の登録、一覧、投稿のない投稿者の削除。
- 投稿者を選んでタイトル・本文を投稿、一覧表示、投稿者ごとの絞込み、投稿削除。
- 画像ON時は、1投稿にJPEG・PNGを任意で1枚添付。画像なしの投稿も可能。
- 添付画像はSupabase Storageの非公開バケットへ保存し、Spring Boot経由で表示。
- PostgreSQLへ投稿者・投稿の関連を保存し、再読込後も表示。

ログイン・アカウント登録・パスワード管理はありません。投稿者は表示名を持つデータで、認証ユーザーではありません。現在は編集機能・複数画像・Render公開は対象外です。

## 起動

Windows PowerShellでこのフォルダーを開きます。Java 17が必要です。Mavenの別途インストールとDockerは不要です。

```powershell
# 画像なし（Storageキー不要）
.\run-local.ps1 -Action run

# 画像あり（Storageキーが必要）
.\run-local.ps1 -Action run -Images
```

ブラウザーで http://127.0.0.1:8080/ を開きます。停止はCtrl+Cです。最初に投稿者を追加し、その投稿者で複数の投稿を保存できます。初回起動時にFlywayが専用スキーマとテーブルを作成します。

認証なしのため、画面にアクセスできる人はすべての投稿者・投稿を操作できます。初期設定は `127.0.0.1` へのバインドです。外部公開する場合は利用範囲に応じた認証・権限設計を別途行います。

### 接続情報

接続情報・秘密情報・動作設定は、このフォルダーの `.env` で管理します。`.env` と `.env.*` はGit管理対象外で、値を含まない [.env.example](.env.example) だけを共有します。初めて準備するPCでは以下でコピーし、Dashboardの接続情報を入力します。

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

形式は1行に `KEY=value`。空白を含む値は単一または二重引用符で囲めます。`$`・`#`・`=` はそのまま扱い、変数展開・コマンド実行・エスケープ変換はしません。コメントは独立した `#` 行に書き、値の後ろには付けません。複数行の値・重複キーは使いません。

接続先は開発専用Supabaseプロジェクト `web-app-template-dev`（Tokyo）です。ホスト名・ユーザー名はDashboardからコピーし、Data APIはOFFのまま利用します。Storageキーは画像ONの場合だけ必要です。

[run-local.ps1](run-local.ps1)が `.env` を読み、Maven・Javaの環境変数へ渡します。Spring Bootが `.env` を自動読込みするわけではありません。終了時には元の環境変数を復元します。旧 `.secret` の自由形式メモは使用しません。

| 設定 | 初期値・用途 |
|---|---|
| `DB_HOST / DB_PORT / DB_NAME` | Session poolerのホスト、5432、postgres。スクリプトが証明書設定付きJDBC URLを組み立てる |
| `SPRING_DATASOURCE_USERNAME / PASSWORD` | DB接続ユーザー名とDBパスワード |
| `SPRING_DATASOURCE_URL` | 必要な環境で明示するJDBC URL。設定時はURL組立てを使わない。TLS検証を含める |
| `SUPABASE_URL` | `https://PROJECT_REF.supabase.co` |
| `SUPABASE_SECRET_KEY` | Storageサーバー用キー。ブラウザーへ渡さない |
| `APP_IMAGES_ENABLED` | 既定は `false`。`-Images` で `true` |
| `SUPABASE_STORAGE_BUCKET` | `template-post-images-dev`。最初の画像投稿時に非公開で作成 |
| `APP_DB_SCHEMA` | 通常は `app_template` |
| `SERVER_PORT` | 既定は8080 |

優先順位は「起動引数・テスト専用設定 → 既存の環境変数 → `.env` → アプリの既定値」です。`-Images` は画像ON、`-Images:$false` はOFFを明示します。`.env` で `APP_IMAGES_ENABLED=true` にすれば通常の起動でも画像を利用できます。画像OFFではStorageへ接続しません。保存済み画像の情報は維持し、画像つき投稿の削除は画像ONで行います。

CI・公開先ではサービスの環境変数・シークレット設定を使い、`.env` を配布しません。ローカルスクリプトも必要な環境変数が揃っていれば `.env` なしで動きます。パスワードやキーを変更したら、Supabase側と `.env` または実行環境の設定を揃えて再起動し、接続テストを行います。

JDBCはSession poolerの5432番ポートへ、`sslmode=verify-full` と同梱[公開CA証明書](certs/README.md)を使って接続します。PC・Java全体の信頼ストアは変更しません。接続数の初期上限は3です。現段階ではDashboardの管理用DB接続を使い、公開前にアプリ専用ロール・権限を別途設計します。

## 画像の扱い

- JPEG・PNGのみ、1枚5MB・1600万画素以下。ファイル名や申告MIMEだけで判断せず実際にデコードします。
- サーバーで再エンコードし、元ファイルのメタデータを引き継がず、UUIDのオブジェクト名で保存します。
- 非公開バケットの画像はSpring Bootが取得して返します。Storageキー・期限付きURLはHTMLに含めません。
- 画像保存後にDB保存が失敗した場合は、その画像を削除します。後片付けにも失敗した場合、ログの `Image cleanup pending` にバケット名・オブジェクト名が残ります。Storage復旧後、DBの参照がないことを確認してそのオブジェクトだけ削除します。
- 投稿削除では画像削除を先に行います。Storageが失敗した場合は投稿を残し、再試行できます。画像削除後のDB削除が失敗した場合も、接続復旧後に同じ投稿の削除を再試行します。
- 通信切断やプロセス停止をまたぐ自動復旧キューは未実装です。DBとStorageは単一トランザクションではありません。

## テスト

### Java・実PostgreSQL

```powershell
.\run-local.ps1 -Action test
.\run-local.ps1 -Action package
```

`test` と `package` は `app_template_test` を使います。`package` はテストを含めてJarを作成します。既存データを消すテストはありません。DB接続テストは一時テーブルをロールバックします。画像の内容検証・容量制限・画像OFF時の拒否・失敗時の後片付けはJavaテストで検証します。設定読込みの単独検査は `powershell.exe -NoProfile -File tests/config.test.ps1` で実行できます。

### Playwright・実Storage

Node.jsが必要です。静的UIサンプル `admin-pico` のテストとは別に、このSpring Bootアプリを検証します。

```powershell
npm ci
npx playwright install chromium

# 画像なし：Storageキー不要
npm run test:e2e:text

# 画像あり：実Supabase Storageへの保存・表示・削除を含む
npm run test:e2e:images

# 両方
npm run test:e2e
```

PlaywrightがSpring Bootを起動して終了します。通常の開発サーバーの使い回しはしません。

| 検証 | ポート | DBスキーマ | Storage |
|---|---|---|---|
| 画像OFF | 18081 | `app_template_e2e_text` | 使用しない |
| 画像ON | 18082 | `app_template_e2e_images` | `template-post-images-e2e`（非公開） |

テストはランダム名の投稿者・投稿とサンプル画像を作り、自分で作ったデータだけ削除します。実行時に強制終了した場合は該当実行のデータが残ることがあります。レポート・スクリーンショット・失敗時トレースはGit管理対象外の `playwright-report/` と `test-results/` に保存します。

2026-10-27、Windows・Temurin JDK 17.0.14・実Supabaseで以下を確認しました。

- Java：7テスト成功。実DB接続・SQL、日本語データの書込み・読取り、画像検証、失敗時の処理。
- Playwright：画像ON・OFFで計4ケース成功。認証なしの画面、1対多、再読込、絞込み、実Storageへの保存・画像表示・削除、不正画像拒否、CSRF拒否に加え、Pico資産のローカル読込み・モバイルメニュー・横はみ出しを検証。
- テスト用バケットが非公開で、テスト終了後のオブジェクト数が0であることを確認。

実Storageの正常系と、模擬したDB・Storage障害のテストは区別しています。Render上の動作は未検証です。

## 構成

| 項目 | 内容 |
|---|---|
| Java / Spring Boot | 17 / 4.1.2 |
| Web / 画面 | Spring MVC / Thymeleaf / Pico CSS 2.1.1 / admin-pico |
| DB | Spring JDBC / Supabase PostgreSQL |
| スキーマ管理 | Flyway |
| 画像 | Supabase Storage REST API。SpringのRestClientで利用 |
| フォーム保護 | Spring SecurityのCSRF・ヘッダー。ログイン機能は無効 |
| ブラウザーテスト | Playwright 1.64.1 / Chromium |

[テンプレート仕様](テンプレート仕様.md)を参照してください。Spring Initializrでの初期生成要求は[initializr-request.json](initializr-request.json)に保存しています。OAuth2 Resource Server等は生成時には選択しましたが、現在の認証なし構成からは外しています。

### admin-picoの利用・更新

画面は [admin-pico](admin-pico/README.md) のサイドバー・ヘッダー・カード・ニュース一覧・バッジ・フォーム配置・モバイルメニューを利用します。色・共通レイアウトを投稿画面で独自に再定義することは避けます。

- `admin-pico/src/css/admin-theme.css`、`admin-layout.css`、`admin-components.css`、`js/admin.js` とサンプルアプリのfaviconを、Mavenのresources設定でそのまま `static/admin-pico/` へ取り込みます。複製したソースを別管理しません。
- 元の `css/pico.css` はCDN importのため、Pico本体のみ [vendor/pico](src/main/resources/static/vendor/pico/README.md) に2.1.1を固定して同梱します。MITライセンスも保持し、画面表示時のCDN接続は不要です。
- `src/main/resources/templates/posts.html` は既存のニュース画面の構造をThymeleafへ組み込みます。サンプルのログイン表示・架空の集計・未実装メニューは持ち込みません。
- `src/main/resources/static/app.css` は投稿画像・投稿者の行配置と、Pico 2のボタン色・カード余白の調整だけを担当します。
- 共通デザインを変更するときは `admin-pico/src` を更新して再起動・再ビルドし、Playwrightで画像ON・OFFとモバイル表示を確認します。現在の取込み対象以外の資産を使う場合は `pom.xml` のincludesも追加します。

接続・Storage・テストの参照資料（確認日：2026-10-27）：[Supabase接続](https://supabase.com/docs/guides/database/connecting-to-postgres)、[Storage API](https://supabase.com/docs/reference/self-hosting-storage/introduction)、[APIキー](https://supabase.com/docs/guides/getting-started/api-keys)、[SpringのDB初期化](https://docs.spring.io/spring-boot/how-to/data-initialization.html)、[Playwrightのサーバー起動](https://playwright.dev/docs/test-webserver)。
