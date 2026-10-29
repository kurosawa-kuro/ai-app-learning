# Googleログインの設定と確認

更新日：2026-10-29。対象はtemplateとWeb版5教材。コードは共通化済み、既定無効。実Google／Renderの受入・公開先の有効化は未実施。[ADR 0004](../../../../docs/adr/0004-auth-gas-simple-web-supabase.md)を参照。

## 先に理解する境界

Supabase Authで本人確認し、各アプリの業務DBの`app_admins`にあるメールだけに全操作を許可する。管理者同士は同じアプリデータを共有する。投稿者・利用者の選択は業務データの選択であり、本人認証や利用者別のデータ分離ではない。Auth用Supabaseと業務DB・Storageは別プロジェクトでもよく、Authの追加で既存DB・画像を移動する必要はない。

`APP_AUTH_ENABLED=false`は認証なしのデモ用。`true`で設定不足なら起動を止める。認証サービスの障害や検証用プロジェクトの削除時に、自動で`false`へ戻してはいけない。認証を有効にしたままアクセスを閉じ、必要ならRenderを停止する。

## Supabase・Googleを設定する

1. Auth用プロジェクトでGoogleプロバイダーを有効にする。Google側のOAuthクライアントはウェブアプリケーション用とし、Googleの承認済みリダイレクトURIへ**Supabaseが表示する**`https://<auth-project>.supabase.co/auth/v1/callback`を登録する。アプリの戻り先とは別のURL。
2. Supabase側のRedirect URLsへアプリごとの正確な`/auth/callback` URLを登録する。ローカルは`http://localhost:<port>/auth/callback`、Renderは`https://<service>.onrender.com/auth/callback`。本番でワイルドカードを使わない。Site URLも運用するアプリに合わせる。
3. 新規登録を無効にする。管理者が管理画面で、Googleと同じメールの確認済みユーザーを用意する。招待メールは使わない。Google以外のログイン方式・匿名ログインは有効にしない。管理用キーやパスワードをアプリへ渡さない。
4. **受入前提の確認**：新規登録禁止のまま、事前作成ユーザーへGoogle Identityが連携されること、未作成のGoogleアカウントは拒否されユーザーが増えないことを実Googleで確認する。この組合せはまだ実測していない。失敗した場合は設定・Authログを調べ、無断で新規登録を開放しない。
5. JWT Signing Keysは本実装で検証する`ES256`または`RS256`を使う。旧`HS256`や他方式は受入対象外。JWT秘密鍵・service_role・`sb_secret_`はアプリのAuth設定に使わない。

公式情報（2026-10-28確認）：[Google設定](https://supabase.com/docs/guides/auth/social-login/auth-google)、[リダイレクト](https://supabase.com/docs/guides/auth/redirect-urls)、[Identity連携](https://supabase.com/docs/guides/auth/auth-identity-linking)、[一般設定](https://supabase.com/docs/guides/auth/general-configuration)、[署名鍵](https://supabase.com/docs/guides/auth/signing-keys)。模擬試験はSupabaseのプロバイダー設定・Identity連携・Google同意画面の実証にはならない。

## 各アプリを設定する

| 環境変数 | 値・役割 |
|---|---|
| `APP_AUTH_ENABLED` | 設定・許可表登録後に`true`。デモとして認証を外す場合だけ明示的に`false` |
| `SUPABASE_AUTH_URL` | AuthプロジェクトのURL。業務Storageの`SUPABASE_URL`と区別 |
| `SUPABASE_AUTH_PUBLISHABLE_KEY` | 同じAuthプロジェクトの公開キー。管理用secretは不要 |
| `APP_AUTH_CALLBACK_URL` | 許可一覧と完全一致する固定の戻り先。RenderはHTTPS必須。Host／転送ヘッダーから自動生成しない |
| `APP_AUTH_HOME` | ログイン後のアプリ内パス。省略時は下表 |

| アプリ | 既定の入口 |
|---|---|
| template | `/` |
| cast-evaluation | `/evaluation` |
| english-trainer | `/learning` |
| online-shop | `/shop` |
| photo-diary | `/diary` |
| skill-janken-game | `/janken` |

Flyway V15適用後、**対象アプリの業務DBスキーマ**で次を実行する。Auth専用プロジェクトのpublicスキーマへ間違えて登録しない。メールは架空例なので本人のGoogleメールへ置き換える。

```sql
INSERT INTO app_admins(email, note)
VALUES (lower('owner@example.com'), '管理者')
ON CONFLICT (email) DO NOTHING;
```

ローカルは各アプリの`.env`と`run-local.ps1`、Renderは環境変数を設定する。`scripts/render.ps1 env`はAuth設定も送信する。全設定を検証してから送信し、`true`はURL・公開キー・HTTPSコールバックが揃わなければ拒否する。Blueprintの`APP_AUTH_ENABLED`は`sync:false`とし、再同期で有効な認証を`false`へ戻さない。新規作成時も値を明示する。

## ログアウト・期限切れ・権限削除

- HTTPSの固定戻り先なら、Render内部のHTTP接続でもトークンCookieは`Secure`。アクセストークン・更新トークン・PKCE検証値は`HttpOnly`／`SameSite=Lax`で扱う。
- JWTは署名・発行者・宛先`authenticated`・role・期限を確認する。更新後も検証・許可判定が通ってからCookieへ保存する。
- ログアウトはCSRF必須のPOST。Supabaseの`scope=local`で現在のセッションだけを対象とする。アクセストークンが期限切れなら更新してから失効を試す。通信障害時にもこのブラウザーのCookieは消すが、サーバー側失効の成功までは保証しない。JWTは失効操作後も期限まで有効になり得る。[公式ログアウト仕様](https://supabase.com/docs/guides/auth/signout)
- `app_admins`の許可判定は最大60秒キャッシュするため、行削除だけで即時拒否とは説明しない。至急閉じる場合はサービス停止等で入口を閉じる。新規ログイン時には該当メールのキャッシュを破棄する。
- 429・5xx・通信障害で更新できなかった場合は、再試行できるようCookieを保持する。更新トークンが拒否された場合はCookieを消す。
- 投稿フォームと、ログイン中の標準POSTフォームは、認証切れで画面を遷移させず入力・選択ファイルを残す。別タブでログインして戻り、本人が再送する。自動で書込みを再送しない。ブラウザーを閉じた後までの保存は行わない。

## 1教材ずつ行う実環境受入

- [ ] 事前作成済み管理者のGoogleログインと、未作成ユーザーの新規登録拒否。
- [ ] Supabaseユーザーでも`app_admins`にないアカウントはアプリへ入れない。
- [ ] 未ログインで画面・画像直リンク・CSV・API・AI・設定を開けず、ログイン画面と必要な静的資産・ヘルスチェックだけ取得できる。
- [ ] ログイン後の入口・アカウント表示・各教材の主要保存・再読込を確認。
- [ ] Renderで正確なHTTPSコールバック、CookieのSecure／HttpOnly／SameSite、ブラウザーにトークンを表示しないことを確認。
- [ ] 期限切れの自動更新、更新拒否時の入力保持、別タブ再ログイン後の再送、ログアウト後の拒否を確認。
- [ ] 別端末を巻き込まずにログアウトする。許可表削除後はキャッシュ期限経過後に拒否。
- [ ] PC1440px／ブラウザー390pxで表示・操作・画像取得を確認。物理スマホの実機確認は別途記録。

Authプロジェクトを順送りで削除する場合、削除前に対象Renderの閉じ方を決めて記録する。既存Authプロジェクト・Google設定・公開環境を、コード修正の一環として自動削除しない。

## ローカル検証の記録

2026-10-28、6アプリのAuth関連Java試験は各20件・計120件成功。PKCE、JWTの署名・iss・aud・role・期限、管理者許可、Cookie、期限更新、ログアウト、CSRF、保存要求の401を模擬Authと専用テストDBで確認した。

templateの認証切れ回復ブラウザー試験は画像OFF／ONで各2件成功。入力・選択ファイル・要求IDを保持し、本人の再送で保存できることを確認。Render設定反映は模擬HTTPで6アプリ×2条件成功。実Google・実Renderへの認証通信や各教材の認証有効時のPC／狭幅受入を完了した記録ではない。

再確認は各アプリの`run-local.ps1 -Action test`でAuth関連テスト、templateの`tests/e2e/auth-recovery.spec.js`と`tests/auth-deployment.test.ps1`を使う。実環境で残る確認は上の受入チェックに集約する。
