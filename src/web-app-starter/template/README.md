# Web App Template

今後の改修課題は[横展開前の課題一覧](docs/improvement-backlog.md)、画像を中心にした画面の到達像は[画像投稿UI改善案](docs/image-post-ui-plan.md)に整理しています。優先度・現状・完了条件を記載した計画であり、未実装の項目を含みます。

実装は **Clean Architecture × DDD Lite × Modular Monolith** で構成しています。機能ごとの公開API、業務ルール、DB・画像保存の境界、改修例は[構造と改修の入口](docs/architecture.md)を参照してください。提供者向けの設計であり、利用開始に全層の学習は必要ありません。

2026-10-27の構造改修後：Java 30件、JavaScriptのルールテスト2件が成功。Playwrightは初回13件成功・404表示の2件失敗・対象外3件となり、404修正後に該当2件を再実行して成功しています。画像ON/OFF、投稿・アイコンの実Storage連携、CSV、ユーザー切替、ゲーム、PC・モバイルを確認しました。`seed-preview` の前後で開発DBの8投稿・3ユーザー・画像許可ON・削除待ち0件が一致しました。クラウドへの再デプロイは行っていません。

ログインなしで使う、管理画面を備えたSpring Bootスターターです。ユーザー管理・機能管理を共通の土台にし、投稿者と投稿の **User 1：Post 多** をサンプル機能として組み込んでいます。提供者が一つの題材でAIと改修・確認を繰り返すために使います。

## できること

配色は写真日記アプリから移植したライトテーマです。淡いピンクの背景・白いカード・ピンク〜パープルのグラデーションとパステルの補助色を、投稿・管理・ユーザー切替・ゲームで共通利用します。色の正本は `src/main/resources/static/ui/photo-diary-theme.css` です。

- 「管理・設定」のポップアップから、ユーザー管理・機能管理・CSVエクスポートへ移動する。
- ユーザーの作成・選択・デフォルト指定。画像投稿・AI連携の許可／禁止をDBに保存する。
- 投稿者の登録、一覧、投稿のない投稿者の削除。
- サイドバーをアプリの移動・管理メニュー・左下のユーザー切替に分け、投稿一覧・新規投稿・ゲームへ移動する。
- 投稿者の確認・変更・追加を投稿フォーム内へ集約。入力・通信エラーでも下書きを保持。
- デスクトップ・タブレット・スマホに対応。スマホでは上部のメニューから移動する（[テンプレート仕様](テンプレート仕様.md)）。
- 画像ON時は、1投稿にJPEG・PNGを任意で1枚添付。画像なしの投稿も可能。
- 添付画像はSupabase Storageの非公開バケットへ保存し、Spring Boot経由で表示。
- 投稿画像の選択プレビュー・一覧サムネイル。ユーザーアイコンの登録・変更・削除と、投稿者・ユーザー切替への反映。
- PostgreSQLへ投稿者・投稿の関連を保存し、再読込後も表示。

ログイン・アカウント登録・パスワード管理はありません。投稿者は表示名を持つデータで、認証ユーザーではありません。現在は編集機能・複数画像は対象外です。Render用の設定は用意済みですが、公開前の認証・DB権限設計は未実施です（[Render](#render)）。

## UI確認用のシードデータ

架空の3人・12件の投稿を用意しています。1ページ10件を超える件数にし、先頭ページ・2ページ目・前後移動を最初から確認できます。短文、段落のある長文、英語を含むメモ、画像付きの記録を混ぜ、一覧・詳細・投稿者別の絞込みを確認できます。日時は実行日から直近12日間に分散します。画像はコードで描いた2枚のサンプル図で、実在の人物や業務データを含みません。

```bash
# 接続先スキーマ・件数・画像設定を確認（投稿を変更しない）
./run-local.sh -Action seed-preview

# 足りないサンプル投稿だけ追加。既存投稿・サンプルの変更内容を保持
./run-local.sh -Action seed

# 画像OFFで作ったサンプルへ、不足する2枚の画像だけ追加（投稿は削除しない）
./run-local.sh -Action seed-images

# 対象スキーマの全投稿を削除し、12件のサンプルに置換
./run-local.sh -Action seed-reset

# 置換後に削除できなかった旧画像だけ再試行
./run-local.sh -Action seed-cleanup
```

PowerShellでも `.\run-local.ps1 -Action seed-reset` のように実行できます。接続は通常起動と同じ `.env`・環境変数を使い、実行後は終了します。**`seed-reset` はサンプル以外も含めて全投稿を削除します。** 対象は `app_template` または検証専用の `app_template_seed_test` に限定しますが、同じDBを共有するアプリには変更が即時反映されます。提供者が開発用DBで実行し、実行中は投稿操作・他のシード実行を止めてください。

既存ユーザー、選択Cookie、デフォルトユーザー、機能設定は変更しません。サンプルユーザーは固定IDで追加するため、繰り返しても重複しません。通常起動・マイグレーションではシードを投入しません。

画像許可がONなら2枚をStorageへ保存します。OFFなら12件とも画像なしにし、許可設定を勝手に変更しません。ONへの切替だけでは、既存投稿に画像は添付されません。既存サンプルの画像も見たい場合は管理画面で許可した後、`seed-images` を実行します。画像対象のサンプル2投稿に、未登録の画像だけを補い、タイトル・本文・ユーザー投稿・既存画像は維持します。繰り返しても画像を重複追加しません。画像準備やDB登録が失敗した場合は既存投稿を残します。`seed-reset` のDB置換は一つのトランザクションで行い、成功後に旧投稿が参照していた画像だけ削除します。バケット全体は削除しません。

2026-10-27、開発データで画像なしのまま残っていたサンプル2投稿へ `seed-images` を実行済みです。9投稿・3ユーザーを維持し、画像付き投稿は1件から3件になりました。Java 34件成功。`node tests/post-images-preview.cjs` で、実際の開発アプリの2枚について一覧・詳細のHTTP 200と画像デコードをPC1280px・スマホ390pxで確認しました。このコマンドは読取専用で、確認画像を `test-results/post-images-preview/` に保存します。

旧画像の削除失敗はDBの `image_cleanup` に残り、`seed-cleanup` で再試行できます。終了コードは成功0、失敗1、DB処理成功・画像の後片付け残あり2です。アップロード途中のプロセス強制終了やDB接続断まで含む完全な自動復旧は未対応です。

起動済みアプリに対して `node tests/seed-preview.cjs` を実行すると、12投稿の一覧・詳細、投稿者による絞込み、PC幅1280px・スマホ幅390pxをPlaywrightで確認し、`test-results/seed-preview/` に画像を保存します。投稿を送信・削除しない確認専用コマンドです。別ポートでは環境変数 `SEED_PREVIEW_URL` を指定します。

2026-10-27、シード追加後のJavaテスト18件が成功。開発スキーマ `app_template` の既存5投稿を8件へ置換し、既存3ユーザーにサンプル3ユーザーを追加しました。画像投稿OFF・管理設定を維持し、PC・スマホで全8件の詳細と絞込みを確認済みです。画像付きシードの障害処理はStorageを模擬したJavaテストで確認し、この開発データには画像を投入していません。

## 起動

Git Bashでこのフォルダーを開きます。Java 17が必要です。Mavenの別途インストールとDockerは不要です。

```bash
# 通常起動。画像の許可／禁止は管理画面で変更
./run-local.sh -Action run

# 新しいDBスキーマで、画像許可を初期値にする場合のみ
./run-local.sh -Action run -Images
```

[run-local.sh](run-local.sh)は引数をそのまま [run-local.ps1](run-local.ps1) へ渡す入口です。PowerShellからは `.\run-local.ps1 -Action run` でも同じです。

ブラウザーで http://127.0.0.1:8080/admin を開きます。停止はCtrl+Cです。「ユーザー管理」でユーザーを追加し、必要ならデフォルトに指定します。「機能管理」で機能を選び、「新規投稿」から試します。初回起動時にFlywayが専用スキーマとテーブルを作成します。

認証なしのため、画面にアクセスできる人はユーザー・投稿・管理設定を操作できます。「管理画面」という名前はアクセス制限を意味しません。初期設定は `127.0.0.1` へのバインドです。

### 管理画面の使い方

左下のユーザー名を押すと、検索付きの切替ポップアップが開きます。選ぶと画面を移動せず、このブラウザーの選択を変更します。投稿フォームではタイトル・本文・選択済み画像を残し、投稿者だけを更新します。デフォルトユーザーや保存済み投稿の持ち主は変更しません。追加・削除はポップアップ下部の「ユーザーの追加・管理」から行います。

「管理・設定」を押すと、ユーザー管理・機能管理・CSVエクスポート・管理の一覧が開きます。ポップアップは操作の入口で、設定編集は専用画面で行います。Esc・閉じるボタン・外側のクリックで閉じられ、スマホでも同じ導線を使えます。ゲームの上部にも管理メニューを置きますが、ゲームに投稿用のユーザー切替は表示しません。

2026-10-27、ポップアップ導入後のJavaテスト21件が成功。Playwrightは13実施ケースを確認済み（画像OFFでのStorage専用ケースなど3件は対象外）。管理ボタン重複の修正後、該当4ケースを再確認し、ユーザー一覧の再読込み調整後は画像ON/OFFの切替2ケースも再確認しました。入力・添付保持、選択Cookie・デフォルト維持、通信失敗、CSRF拒否、PC・スマホ配置、Esc・フォーカス復帰を確認しています。

| 画面 | 操作と反映範囲 |
|---|---|
| `/admin/users` ユーザー管理 | ユーザーを作成して選択。この投稿アプリでは投稿者として使う。選択はブラウザーのCookieに記憶 |
| デフォルトユーザー | 未選択のブラウザーが使うユーザーをDBに保存。選択済みのユーザーは維持。対象ユーザーを削除すると指定も解除 |
| `/admin/settings` 機能管理 | 画像投稿・AI連携を許可／禁止。保存後のリクエストからアプリ全体へ反映し、再起動後も維持 |

画像投稿を禁止すると、新しい添付を画面・サーバーの両方で止めます。保存済み画像の表示と投稿削除は継続します。許可で保存するとStorageへ接続確認し、未作成なら非公開バケットを作成します。失敗した場合、機能設定は更新せず入力を保持します。

AI連携は**許可設定のみ実装済み**です。AI処理・接続先・APIキー設定は未実装で、許可しても外部AIへ通信しません。各アプリでAI処理を追加する際は、呼出し直前に `FeaturePolicy.requireAiEnabled()` を通します。画像の投稿可否は `FeaturePolicy.requireImagesEnabled()` で検査し、Storage接続は `ImageStore` が担当します。接続キーを管理画面へ表示・保存しません。

設定を増やす際は、`settings` モジュールの型付きAPI・保存Port/Adapter・新しいFlywayマイグレーション・管理画面のカテゴリを追加します。画面の表示だけで機能を禁止せず、処理側でも許可を確認します。デフォルトユーザーは `authors` モジュールが担当します。旧 `/users`・`/settings` の閲覧URLは管理画面へ転送します。

AI連携カードには、今日・今月・累計の利用金額を円で表示します。現在は128円・2,480円・12,640円の固定ダミーデータで、実際の利用・請求額ではありません。AI許可のON／OFFにかかわらず表示し、設定保存で金額は変更しません。実利用の集計や課金APIとの連携は未実装です。

### 投稿一覧のページ切替

投稿一覧は1ページ10件です。総件数・表示範囲と「前へ／次へ」を表示し、投稿者の絞込み条件を維持して移動できます。絞込みを変更すると先頭ページに戻ります。存在する範囲を超えたページは最終ページ、0以下は先頭ページを表示します。SQL側で取得件数を制限し、一覧順と投稿者別の一覧順に対応するインデックスを使います。CSVエクスポートは引き続き全件を出力します。

### 投稿画像とユーザーアイコン

投稿画像は「管理・設定 → 機能管理」で画像投稿を許可すると使えます。新規投稿でJPEG・PNGを選択すると保存前にプレビューし、保存後は一覧のサムネイルと詳細画面で表示します。投稿画像は任意の1枚、5MB・1600万画素までです。

ユーザーアイコンは「管理・設定 → ユーザー管理 → アイコンを変更」で登録・差し替えます。JPEG・PNGを検証して中央を正方形に切り抜き、256×256pxのPNGとして保存します。未登録時・画像を表示できない時は頭文字を表示します。ユーザー一覧・左下・切替ポップアップ・投稿一覧・投稿詳細に反映します。

アイコンはユーザーの設定なので、**投稿の画像許可とは独立**しています。Storage接続が設定済みなら、投稿画像がOFFでも登録できます。削除時は頭文字に戻り、ユーザーと投稿は残ります。ユーザー自体の削除時はアイコンも後片付けし、投稿があるユーザーの削除は従来どおり拒否します。

アイコンは投稿画像と同じ非公開Storageバケットを使用します。差し替えは新画像の保存→DB更新→旧画像の削除の順で、DB更新が完了する前の失敗では旧アイコンを維持します。後片付けの失敗は `image_cleanup` に記録し、`./run-local.sh -Action seed-cleanup` で再試行できます。このコマンドは投稿を削除・再投入せず、投稿・アイコンから参照されていない保留画像だけを削除します。プロセス強制終了やDB接続断まで含む完全な自動復旧は未対応です。

画像対応の検証：Java 25件、Playwright 15件成功（対象外3件）。実Supabase Storageでアイコンの登録・差し替え・削除、投稿画像の保存・表示を確認しています。追加でアイコンの読み込み完了と投稿プレビュー・一覧サムネイルも確認済みです。開発用アプリの画像投稿はONにし、既存のユーザー・投稿・AI許可設定を保持しています。

### CSVエクスポート

管理画面 `/admin` の「CSVエクスポート」から、ユーザーと投稿を別々にダウンロードできます。選択中のユーザーや一覧の絞込みに関係なく、登録済みの全件を出力します。0件なら見出し行だけを出力します。

- ユーザー：ID、名前、投稿数、作成日時。
- 投稿：ID、ユーザーID、ユーザー名、タイトル、本文、画像添付の有無、投稿日時。
- 形式：UTF-8 BOM付き、カンマ区切り、CRLFの行区切り。日時は日本時間のISO 8601形式。カンマ・引用符・本文の改行を保持します。
- Excelで数式として解釈され得る値には先頭にアポストロフィを付け、文字列として扱います。DBの元データは変更しません。
- 画像ファイル・Storage内部パス・接続秘密情報・管理設定は含みません。完全復元用のバックアップではありません。

インポートは未実装です。アプリ固有の項目・検証・重複時の扱いを決めてから追加します。現行テンプレートにはログインがないため、CSV出力も他の管理操作と同じくアプリに接続できる人が利用できます。

2026-10-27、CSV追加後のJavaテスト21件が成功。日本語・引用符・改行・数式対策・空データ・DB障害を検証しました。Playwrightで管理画面から2種類のCSVを実際にダウンロードし、PC幅1280px・スマホ幅390pxの表示を確認済みです。

### 接続情報

接続情報・秘密情報・初期値は、このフォルダーの `.env` で管理します。画面から変更する機能設定とデフォルトユーザーはDBで管理します。`.env` と `.env.*` はGit管理対象外で、値を含まない [.env.example](.env.example) だけを共有します。初めて準備するPCでは以下でコピーし、Dashboardの接続情報を入力します。

```bash
cp -n .env.example .env
```

形式は1行に `KEY=value`。空白を含む値は単一または二重引用符で囲めます。`$`・`#`・`=` はそのまま扱い、変数展開・コマンド実行・エスケープ変換はしません。コメントは独立した `#` 行に書き、値の後ろには付けません。複数行の値・重複キーは使いません。

接続先は開発専用Supabaseプロジェクト `web-app-template-dev`（Tokyo）です。ホスト名・ユーザー名はDashboardからコピーし、Data APIはOFFのまま利用します。Storageキーは画像の添付・保存済み画像の表示と削除に必要です。

[run-local.ps1](run-local.ps1)が `.env` を読み、Maven・Javaの環境変数へ渡します。Spring Bootが `.env` を自動読込みするわけではありません。終了時には元の環境変数を復元します。旧 `.secret` の自由形式メモは使用しません。

| 設定 | 初期値・用途 |
|---|---|
| `DB_HOST / DB_PORT / DB_NAME` | Session poolerのホスト、5432、postgres。スクリプトが証明書設定付きJDBC URLを組み立てる |
| `SPRING_DATASOURCE_USERNAME / PASSWORD` | DB接続ユーザー名とDBパスワード |
| `SPRING_DATASOURCE_URL` | 必要な環境で明示するJDBC URL。設定時はURL組立てを使わない。TLS検証を含める |
| `SUPABASE_URL` | `https://PROJECT_REF.supabase.co` |
| `SUPABASE_SECRET_KEY` | Storageサーバー用キー。ブラウザーへ渡さない |
| `APP_IMAGES_ENABLED` | 新規スキーマでの初期値。既定は `false`、`-Images` で `true`。保存済み設定を上書きしない |
| `SUPABASE_STORAGE_BUCKET` | `template-post-images-dev`。画像許可の保存時または初回投稿時に非公開で作成 |
| `APP_DB_SCHEMA` | 通常は `app_template` |
| `SERVER_PORT` | 既定は8080 |
| `RENDER_API_KEY` | `scripts/render.sh` 専用のRender APIキー。アプリには渡さない |

接続情報と初期値の優先順位は「起動引数・テスト専用設定 → 既存の環境変数 → `.env` → アプリの既定値」です。**機能の許可／禁止は、初回作成後はDBの `app_settings` が正本**です。`-Images` や環境変数を変えて再起動しても、保存済み設定を上書きしません。同じDBスキーマを使うローカルとRenderは設定も共有します。キーが未設定でもテキスト投稿は利用できますが、画像の新規添付・既存画像へのアクセスにはStorage接続情報が必要です。

CI・公開先ではサービスの環境変数・シークレット設定を使い、`.env` を配布しません。ローカルスクリプトも必要な環境変数が揃っていれば `.env` なしで動きます。パスワードやキーを変更したら、Supabase側と `.env` または実行環境の設定を揃えて再起動し、接続テストを行います。

JDBCはSession poolerの5432番ポートへ、`sslmode=verify-full` と同梱[公開CA証明書](certs/README.md)を使って接続します。PC・Java全体の信頼ストアは変更しません。接続数の初期上限は3です。現段階ではDashboardの管理用DB接続を使い、公開前にアプリ専用ロール・権限を別途設計します。

## Render

RenderがGitから [Dockerfile](Dockerfile) をビルドします。手元のDockerは不要です。コンテナでは `render` プロファイル（[application-render.properties](src/main/resources/application-render.properties)）が有効になり、`0.0.0.0` と Renderの `PORT`（既定10000）で待ち受け、`DB_HOST` から証明書検証付きのJDBC URLを組み立てます。`.env` と `run-local.sh` はコンテナでは使いません。

1. GitHubへpushします。
2. Render Dashboardで New → Blueprint を選び、リポジトリと Blueprint Path `src/web-app-starter/template/render.yaml` を指定します。
3. 作成時に `DB_HOST`・`SPRING_DATASOURCE_USERNAME`・`SPRING_DATASOURCE_PASSWORD` を入力します。値は `.env` と同じです。画像を使う場合は `SUPABASE_URL`・`SUPABASE_SECRET_KEY` をDashboardへ追加して再起動し、管理画面で画像投稿を許可します。

[render.yaml](render.yaml) はfreeプラン・Singapore（Supabase Tokyoに最も近いリージョン）です。Dockerビルドではテストを実行しないため、pushの前に `./run-local.sh -Action test` を通します。`APP_DB_SCHEMA` を変えない限り、ローカルと同じ `app_template` のデータを使います。

作成済みサービス `web-app-template` は [scripts/render.sh](scripts/render.sh) で操作します。`.env` の `RENDER_API_KEY` を使い、値は表示しません。masterへのpushで自動デプロイされます。

```bash
./scripts/render.sh status    # URL・停止状態・最新デプロイ
./scripts/render.sh deploy    # 最新のpush済みコミットを再デプロイし、ページ応答まで待つ。未pushなら中止
./scripts/render.sh suspend   # 公開停止（確認が終わったら実行）
./scripts/render.sh resume    # 再開し、ページ応答まで待つ
./scripts/render.sh env       # .env のDB接続情報をRenderへ反映。その後 deploy
```

公開URLは誰でもアクセスでき、認証なしで全ユーザー・投稿・機能設定・デフォルトユーザーを変更できます。画像投稿を許可するとStorageへのアップロードもできます。DBもDashboardの管理用接続のままです。限定的な検証以外で公開し続ける前に、認証とアプリ専用DBロールを設計します。

## 画像の扱い

- JPEG・PNGのみ、1枚5MB・1600万画素以下。ファイル名や申告MIMEだけで判断せず実際にデコードします。
- サーバーで再エンコードし、元ファイルのメタデータを引き継がず、UUIDのオブジェクト名で保存します。
- 非公開バケットの画像はSpring Bootが取得して返します。Storageキー・期限付きURLはHTMLに含めません。
- 画像保存後にDB保存が失敗した場合は、その画像を削除します。後片付けにも失敗した場合、ログの `Image cleanup pending` にバケット名・オブジェクト名が残ります。Storage復旧後、DBの参照がないことを確認してそのオブジェクトだけ削除します。
- 投稿削除では画像削除を先に行います。Storageが失敗した場合は投稿を残し、再試行できます。画像削除後のDB削除が失敗した場合も、接続復旧後に同じ投稿の削除を再試行します。
- 通信切断やプロセス停止をまたぐ自動復旧キューは未実装です。DBとStorageは単一トランザクションではありません。

## テスト

### Java・実PostgreSQL

```bash
./run-local.sh -Action test
./run-local.sh -Action package
```

`test` と `package` は `app_template_test` を使います。`package` はテストを含めてJarを作成します。既存データを消すテストはありません。DB接続テストは一時テーブルをロールバックします。画像の内容検証・容量制限・画像OFF時の拒否・失敗時の後片付けはJavaテストで検証します。設定読込みの単独検査は `powershell.exe -NoProfile -File tests/config.test.ps1` で実行できます。

### Playwright・実Storage

Node.jsが必要です。静的UIサンプル `admin-pico` のテストとは別に、このSpring Bootアプリを検証します。

```bash
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

- Java：13テスト成功。DB・画像・設定の既存検証に加え、投稿フォームの項目別エラー、DB保存失敗時の入力保持と診断情報の非表示を検証。
- Playwright：画像ON・OFFで計10ケース成功。画像OFFの実Storage専用ケースと、画像ON側の重複するゲーム操作ケースの2件は意図的に除外。投稿・管理設定・実Storage・CSRFに加え、フォーム内での投稿者追加／変更、通信失敗・容量超過時の入力保持、保存中の二重操作防止、削除キャンセル、ドロワーのフォーカス制御、ゲームの選択→決定→結果を確認。
- 表示：投稿・管理・ゲームを390・768・1280・1920pxで撮影。機能管理は820pxも確認。最大幅と見出し／本文の基準線、横はみ出し、長文40emの行幅を検査し、画面画像でフォーム・一覧・ユーザー管理・機能管理・ゲームの配置を確認。
- `.env` の読込み検査成功。今回のテストは専用スキーマ・非公開テストバケットを利用し、作成したユーザー・投稿・画像を削除。

実Storageの正常系と、模擬したDB・Storage障害のテストは区別しています。管理画面追加前の版では、2026-10-27にRender（free・Singapore・画像OFF）でDockerビルド・投稿操作・CSRF拒否・HTTPSへのリダイレクトを確認しています。**今回の共通UI改修版はローカル検証済み、Renderへは未反映**です。ゲームはUI体験までで、GAS版との統合は含みません。

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

画面は [admin-pico](admin-pico/README.md) のサイドバー・カード・テーブル・バッジ・フォーム・スイッチ・モバイルメニューを利用します。色・共通レイアウトを画面ごとに独自に再定義することは避けます。

- `admin-pico/src/css/admin-theme.css`、`admin-layout.css`、`admin-components.css`、`js/admin.js` とサンプルアプリのfaviconを、Mavenのresources設定でそのまま `static/admin-pico/` へ取り込みます。複製したソースを別管理しません。
- 元の `css/pico.css` はCDN importのため、Pico本体のみ [vendor/pico](src/main/resources/static/vendor/pico/README.md) に2.1.1を固定して同梱します。MITライセンスも保持し、画面表示時のCDN接続は不要です。
- `templates/ui/` にAppShell・PageLayout・PageHeader・Form・List・Detail・Feedbackを分離しました。`layout :: page(...)` に画面種別と内容を渡します。フォーム800px・通常1200px・詳細とゲーム960pxの上限を共通化します。
- ナビとアプリ固有CSS/JSは `UiContext` で指定します。共通シェルには投稿者・画像フラグ・投稿用URLを置きません。投稿固有のモデル供給も投稿・管理コントローラーに限定します。
- `static/ui/` が幅・部品の組合せ・状態・アクセシビリティを担当し、`static/features/posts/` が投稿固有の表示・操作を担当します。設計と拡張手順は[共通UI設計](docs/ui-foundation.md)を参照してください。
- `/examples/skill-janken` で同じ基盤を使ったゲームUIを体験できます。固定データによる操作検証で、GAS版の移植・記録保存・AI接続は含みません。
- 共通デザインを変更するときは `admin-pico/src` を更新して再起動・再ビルドし、Playwrightで画像ON・OFFとモバイル表示を確認します。現在の取込み対象以外の資産を使う場合は `pom.xml` のincludesも追加します。

接続・Storage・テストの参照資料（確認日：2026-10-27）：[Supabase接続](https://supabase.com/docs/guides/database/connecting-to-postgres)、[Storage API](https://supabase.com/docs/reference/self-hosting-storage/introduction)、[APIキー](https://supabase.com/docs/guides/getting-started/api-keys)、[SpringのDB初期化](https://docs.spring.io/spring-boot/how-to/data-initialization.html)、[Playwrightのサーバー起動](https://playwright.dev/docs/test-webserver)。
