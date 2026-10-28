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
- `/auth/callback?code=…`：`/auth/v1/token?grant_type=pkce`でトークンへ交換する。メールが`app_admins`にあれば、`app_access`・`app_refresh`（HttpOnly・SameSite=Lax・HTTPSではSecure、30日）を保存して入口へ移る。
- 各リクエスト：アクセストークンをJWKS（ES256・`iss`）でローカル検証する。期限切れなら1回だけ更新し、失効していればCookieを消してログイン画面へ戻す。
- 公開するのは `/login`・`/auth/**`・`/logout`・`/healthz`・`/error` と、ログイン画面の資産（`/vendor/**`・`/admin-pico/**`・`/ui/**`）だけ。
- `POST /logout`（CSRF必須）：Supabaseでリフレッシュトークンを失効させ、Cookieを消す。
- メニューには「ログイン中のアカウント」とログアウトを表示する。テンプレート由来の「選択中のユーザー」は投稿者データとしてそのまま残す。
- コード：`auth`モジュール（`com.example.webapptemplate.auth`）、`platform/BrowserCsrf`、Flyway `V15__app_admins.sql`、`templates/auth/login.html`、`AuthTests`。

事前調査からの変更点：許可表は利用者IDではなく**メールアドレス**（小文字）で照合する。管理者が登録するときにSupabaseのユーザーIDを調べなくて済むため。照合に使うのは、トークンのメールのクレームである。

## 有効にする手順（アプリごと）

1. Auth用のSupabaseプロジェクトでGoogleプロバイダーを有効にする。GoogleのOAuthクライアント（ウェブアプリケーション）の承認済みリダイレクトURIへ、SupabaseのコールバックURLを登録する。
2. SupabaseのURL設定で、リダイレクト許可一覧へ `http://localhost:<port>/auth/callback` とRenderの `https://<service>.onrender.com/auth/callback` を追加する。新規登録は無効にする。
3. 管理画面で、管理者のGoogleメールのユーザーを確認済みとして作成する。
4. アプリのDBへ管理者を登録する：`INSERT INTO app_admins(email, note) VALUES ('<google-email>', '管理者');`
5. 環境変数を設定する：`APP_AUTH_ENABLED=true`、`SUPABASE_AUTH_URL=https://<auth-project>.supabase.co`、`SUPABASE_AUTH_PUBLISHABLE_KEY=<公開キー>`。入口を変える場合は`APP_AUTH_HOME`も設定する。ローカルは`.env`、Renderはサービスの環境変数に入れる。
6. 未ログイン→ログイン画面、管理者→入口、許可表にないアカウント→拒否、ログアウトを確認する。

`APP_AUTH_ENABLED=true`でURLか公開キーが欠けていると、起動時に止まる。

## 検証記録

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

## 残り

- 実Googleログインでの疎通と、新規登録を無効にした状態での挙動の実測（事前調査の第6節）。
- `aud`クレームの検証の追加。
- 保存時にトークンの更新にも失敗した場合の入力保持。フォーム用スクリプトは401の本文を表示するが、入力の退避は未確認。
- 有効化した後の、各教材のPlaywright・PC／スマホの受入と、Renderの受入。
- 「認証なし」と書かれた各教材の文書（educational-baseline・architecture・render-deployment・AGENTS.md）の更新。有効化と受入の後に行う。
