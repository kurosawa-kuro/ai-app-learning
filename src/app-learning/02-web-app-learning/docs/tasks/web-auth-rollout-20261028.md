# Web版6アプリのGoogleログイン実装（2026-10-28）

方針は[ADR 0004](../../../../../docs/adr/0004-auth-gas-simple-web-supabase.md)、方式の調査は[事前調査](cast-evaluation-auth-research-20261028.md)。ownerの「今日中に全Webへ」の指示により、キャスト評価で作った差分を、検証より先にtemplate・5教材へ同時に反映した。

## 状態

| 項目 | 状態 |
|---|---|
| コード（template＋5教材） | 実装済み。6アプリとも試験コードまでコンパイル成功 |
| 既定値 | **`APP_AUTH_ENABLED=false`（従来どおり認証なし）**。Auth用プロジェクトと管理者の登録が揃ったアプリから有効にする |
| 自動試験 | 模擬Supabase Authで実施。結果は下記 |
| 実Googleログイン・Render | 未実施。Auth用プロジェクト・Googleプロバイダーの設定待ち |

## 仕組み

- `/login` →「Googleでログイン」→ `/auth/google`：PKCEの検証値を短命のHttpOnly Cookieへ保存し、`<SUPABASE_AUTH_URL>/auth/v1/authorize?provider=google` へ転送する。
- `/auth/callback?code=…`：`/auth/v1/token?grant_type=pkce`でトークンへ交換し、署名・発行者・宛先・role・期限を検証する。メールが`app_admins`にあれば、`app_access`・`app_refresh`（HttpOnly・SameSite=Lax・HTTPSではSecure、30日）を保存して入口へ移る。
- 各リクエスト：アクセストークンをJWKS（ES256／RS256・`iss`・`aud`・`role`・期限）でローカル検証する。期限切れなら1回だけ更新し、失効していればCookieを消してログイン画面へ戻す。
- 公開するのは `/login`・`/auth/**`・`/logout`・`/healthz`・`/error` と、ログイン画面の資産（`/vendor/**`・`/admin-pico/**`・`/ui/**`）だけ。
- `POST /logout`（CSRF必須）：Supabaseの`scope=local`で現在のセッションの失効を試み、Cookieを消す。通信障害時はローカルCookie削除だけが確実な結果。
- メニューには「ログイン中のアカウント」とログアウトを表示する。テンプレート由来の「選択中のユーザー」は投稿者データとしてそのまま残す。
- コード：`auth`モジュール（`com.example.webapptemplate.auth`）、`platform/BrowserCsrf`、Flyway `V15__app_admins.sql`、`templates/auth/login.html`、`AuthTests`。

事前調査からの変更点：許可表は利用者IDではなく**メールアドレス**（小文字）で照合する。管理者が登録するときにSupabaseのユーザーIDを調べなくて済むため。照合に使うのは、トークンのメールのクレームである。

## 有効にする手順（アプリごと）

1. Auth用のSupabaseプロジェクトでGoogleプロバイダーを有効にする。GoogleのOAuthクライアント（ウェブアプリケーション）の承認済みリダイレクトURIへ、SupabaseのコールバックURLを登録する。
2. SupabaseのURL設定で、リダイレクト許可一覧へ `http://localhost:<port>/auth/callback` とRenderの `https://<service>.onrender.com/auth/callback` を追加する。新規登録は無効にする。
3. 管理画面で、管理者のGoogleメールのユーザーを確認済みとして作成する。新規登録禁止のままGoogle Identityが連携されることは実測待ちなので、この時点でログイン準備完了とはしない。
4. アプリのDBへ管理者を登録する：`INSERT INTO app_admins(email, note) VALUES ('<google-email>', '管理者');`
5. 環境変数を設定する：`APP_AUTH_ENABLED=true`、`SUPABASE_AUTH_URL=https://<auth-project>.supabase.co`、`SUPABASE_AUTH_PUBLISHABLE_KEY=<公開キー>`。`APP_AUTH_CALLBACK_URL`へ許可一覧と一致する固定URLも設定する（RenderはHTTPS）。入口を変える場合は`APP_AUTH_HOME`も設定する。ローカルは`.env`、Renderはサービスの環境変数に入れる。
6. 未ログイン→ログイン画面、管理者→入口、許可表にないアカウント→拒否、ログアウトを確認する。

`APP_AUTH_ENABLED=true`でURL・公開キー・固定コールバックが欠けていると、起動時に止まる。詳細は[設定と確認](../Googleログインの設定と確認.md)。

## 初回実装の検証履歴（以下の件数は見直し前）

- コンパイル：6アプリとも`test-compile`成功（オフライン、依存は`spring-security-oauth2-jose` 7.1.2）。
- 認証の試験：6アプリとも`AuthTests` 5件・`ArchitectureTests` 3件・`PublicAccessTests` 3件の計11件が成功（計66件、各アプリの`*_test`スキーマ、V15適用）。
  - `AuthTests`は模擬Supabase Auth（ES256のJWKS、`grant_type=pkce`／`refresh_token`、`/logout`）を試験内で起動して確かめる。内容は、未ログイン時の保護とログイン画面の資産、PKCEでの転送と交換、許可表による入場と拒否、検証値の使い回し拒否、期限切れ時の更新、失効時のCookie削除、ログアウトのCSRF必須とCookie削除。
  - 最初の実行では2件が失敗した。試験側で手動登録したCookieが、削除用のSet-Cookieと属性違いで消えなかったためで、アプリの不具合ではない。応答ヘッダーで削除指示（`Max-Age=0`）を確かめる形に直し、再実行で成功した。
- 全試験：認証を無効にした既定の状態で、6アプリの全試験を実行した（評価83・template81・英語85・ショップ83・日記85・じゃんけん85件、各1件スキップは実OpenAI試験）。
  - 失敗は6アプリとも`DatabaseRedesignTests`の1件だけだった。移行後の表の一覧を固定値で照合する試験で、追加した`app_admins`が期待値になかったため。期待値へ追加し、再実行で成功した。
- ブラウザー（キャスト評価、認証有効、模擬Supabase Auth、試験用スキーマ）：Playwrightで1440px・390pxを確認した。
  - 未ログイン→ログイン画面、「Googleでログイン」→`/evaluation`、メニューに「ログイン中のアカウント」・表示名・ログアウト、ログアウト→「ログアウトしました。」、ログアウト後の保護、横はみ出しなし。スクリーンショットを開いて目視した。
  - 確認用の架空の管理者は、確認後に削除した。
- ブラウザー確認で見つけて直した不具合2件：
  1. **入口のパスの破損**：Git Bashから`/evaluation`等を引数で渡したため、`app.auth.home`の既定値が`C:/Program Files/Git/...`へ変換されていた。6アプリとも正しい入口へ修正した。`AuthTests`は入口を上書きしていたため検出できなかった。
  2. **ログアウトが403**：ログイン状態をCookieから復元するたびに、Spring Securityのセッション管理が新規ログインと見なしてCSRFトークンを入れ替えていた。画面表示後に別のリクエスト（ユーザー選択の読込等）が走ると、フォームのトークンが古くなる。セッション管理を無効にし、「別のリクエストの後もCSRFトークンが入れ替わらない」試験を`AuthTests`へ追加した。
- 修正後の再実行：6アプリとも`AuthTests` 5件（CSRFの入れ替わり確認を追加）・`ArchitectureTests` 3件・`PublicAccessTests` 3件・`DatabaseRedesignTests` 1件の計12件が成功。
- 実Googleログイン、Renderは未実施。

## 見直しで修正した点（2026-10-28）

- JWTの宛先・role・必須期限の検証漏れを修正。ES256に加えRS256も検証する。旧HS256を通すためにJWT秘密鍵をアプリへ渡す方式は採用しない。
- 固定の`APP_AUTH_CALLBACK_URL`を必須にし、Host／転送ヘッダーを戻り先生成に使わない。HTTPSの固定URLなら内部HTTPのRenderでもSecure Cookieにする。入口の改行・バックスラッシュ・外部転送形式も起動時に拒否する。
- 認証コンテキストをHttpSessionへ保存せず、Cookieのないリクエストが以前のログイン状態を引き継がない。CSRF対策は維持する。
- ログアウトを`scope=local`へ変更。他端末・他アプリのセッションをまとめて失効させない。期限切れアクセストークンは更新後に失効を試みる。
- 429を更新トークンの失効と誤認してCookieを削除していた点を修正。5xx・通信障害も保持して再試行可能にする。更新結果は検証・管理者判定後に保存する。
- 未許可ユーザーの拒否は、Supabaseのログアウト通信が失敗してもCookieを消して維持する。
- `scripts/render.ps1 env`へAuth変数の反映を追加。Blueprint再同期で認証をfalseへ戻さないよう`APP_AUTH_ENABLED`を`sync:false`に変更した。
- 投稿と標準POSTフォームで認証切れ時に入力・選択ファイルを残す。別タブでの再ログイン後に本人が再送する。ブラウザーを閉じた後の復元は範囲外。
- 模擬AuthのPKCEは検証値の存在だけでなくSHA-256照合とコード消費を確認する。アプリ既定の入口を試験で上書きしない。
- 「実装未着手」「認証はない」という現状説明を、コード実装済み・既定無効・実環境未受入へ更新した。

### 見直し後の検証結果

- Java：6アプリで各20件、計120件が成功、失敗・エラー・スキップ0件。内訳は`AuthTests`11件、`AuthPropertiesTests`1件、`SessionCookiesTests`1件、`ArchitectureTests`3件、`PublicAccessTests`3件、`DatabaseRedesignTests`1件。Authサーバーはローカルの模擬HTTPサーバー、DBは各アプリの専用`*_test`スキーマ。
- 追加した検証：PKCEのSHA-256照合と不一致拒否、aud／role不一致とexp欠落の拒否、RS256署名、転送ヘッダーでコールバックが変わらないこと、HTTPS公開URLでのSecure Cookie、外部への入口・secretキー拒否、429で更新Cookieを消さないこと、保存リクエストの401。従来の期限更新・許可表・ログアウトCSRF・CSRF非回転も継続確認。
- ブラウザー：templateの`tests/e2e/auth-recovery.spec.js`を画像OFF／ONの両方で実行し、各2件成功。投稿の401時にタイトル・本文・要求IDを保持し、画像ONでは実際に選択した`sample.png`も保持することを確認。標準フォームは模擬401後に入力を保持し、認証が回復した応答で一度だけ保存できた。これはGoogleへの実ログインをした試験ではない。画像ONの`expired-input.png`を開いて目視した。今回の回復試験は既定のデスクトップ幅であり、各教材の1440／390px受入は別に残す。
- 設定反映：`powershell -NoProfile -File template/tests/auth-deployment.test.ps1`で6アプリ各2条件、計12条件成功。Render HTTPをすべて模擬にし、Auth環境変数が含まれることと、不正コールバックでは環境変数PUTが0件であることを確認。実Renderへは通信していない。
- 共通差分：Authのソース・試験・フォームJSは5教材に対する75ファイル比較で差異なし。各教材の入口・DBスキーマ・業務実装は維持。Renderスクリプト6件の構文検査、変更文書の相対リンク151件と`git diff --check`も成功。
- 最初の手動Maven実行はJDBC URLの組立てを飛ばして起動に失敗した。各アプリの`run-local.ps1`を使い、既存のDB設定を`-SecretsFile`でプロセス内だけに読ませる方法へ直して成功した。秘密値をコピー・表示していない。

実行例：各アプリで`MAVEN_ARGS=-o -Dtest=AuthTests,AuthPropertiesTests,SessionCookiesTests,ArchitectureTests,PublicAccessTests,DatabaseRedesignTests`を設定し、`run-local.ps1 -Action test`を使う。共通接続設定が必要なら`-SecretsFile`で指定する。旧502件等は初回実装時の記録であり、今回の全件再実行を示さない。

## 残り

- 実Googleログインと、事前作成ユーザーのGoogle Identity連携／未作成アカウントの新規登録拒否を実測する。
- 各教材の認証有効状態での業務操作・画像・CSV・AI・異常系、PC／スマホ幅、およびRenderで受入する。
- Auth用プロジェクトの順送り削除前に、対象Renderを認証有効のまま閉じるか停止するか決める。自動で認証を外さない。

運用条件：管理者許可の削除反映は最大60秒。管理者同士のデータは共有。利用者別RLSは未実装。物理スマホ確認はブラウザー390px幅の試験と分ける。今回、Supabase／Google／Render設定・キー・デプロイは変更していない。
