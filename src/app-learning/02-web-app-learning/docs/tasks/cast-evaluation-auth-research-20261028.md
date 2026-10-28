# キャスト評価Web版の認証導入：事前調査（2026-10-28）

状態：**調査と方式の決定まで**（決定は第9節）。コード・DB・Supabase設定・Renderは変更していない。方針の正本は[認証の分担（ADR 0004）](../../../../../docs/adr/0004-auth-gas-simple-web-supabase.md)。

## 1. 目的と前提

Web版の認証をSupabase Authによる本格版へ移す最初の教材として、ユーザーが[キャスト評価](../../cast-evaluation/README.md)を指定した。

キャスト評価は最初の対象に合っている。[事業仮説](../../../docs/05_business-hypotheses.md)で、提供範囲を「管理者限定の実績入力・評価ルール・月次集計・順位」としており、「管理者限定は実際のアクセス制御で確認する。画面のユーザー選択を本人認証と扱わない」と定めている。今回の認証は、この未達の要件を満たす作業にあたる。

**順番**：キャスト評価で先に実装・受入し、確定した差分をtemplateと他教材へ戻す。2026-10-28にownerが承認し、ADR 0004の進め方を更新済み。[横展開の必須ルール](../../AGENTS.md)の「共通修正はtemplateにも戻す」は守る。

## 2. 現状（コードで確認）

| 項目 | 現状 | 根拠 |
|---|---|---|
| アクセス制御 | 全リクエストを許可。Basic認証・フォームログイン・ログアウトは無効。ログインユーザーを作らないダミーの`UserDetailsService` | [WebSecurity.java](../../cast-evaluation/src/main/java/com/example/webapptemplate/platform/internal/adapter/web/WebSecurity.java) |
| CSRF | `CookieCsrfTokenRepository`、ヘッダー`X-CSRF-TOKEN`、SameSite=Lax | 同上 |
| ユーザー選択 | `currentAuthor` Cookie（HttpOnly・365日）で投稿者データを選ぶ。本人認証ではない | [BrowserSelection.java](../../cast-evaluation/src/main/java/com/example/webapptemplate/platform/BrowserSelection.java)、[UserSelectionController.java](../../cast-evaluation/src/main/java/com/example/webapptemplate/authors/internal/adapter/web/UserSelectionController.java) |
| 評価データ | `evaluation_members`・`evaluation_records`・`evaluation_rules`。所有者・店舗を表す列はなく、単一店舗の共有データ | [V11](../../cast-evaluation/src/main/resources/db/migration/V11__cast_evaluation.sql) |
| RLS | 3表ともRLS有効。`anon`・`authenticated`から全権限を剥奪済み | 同上 |
| DB接続 | Session pooler経由。ユーザー名のロール部分は`postgres`。接続プールはRenderで2 | `template/.env`（ロール名だけ確認）、[application-render.properties](../../cast-evaluation/src/main/resources/application-render.properties) |
| Supabaseプロジェクト | template・5教材が**同じプロジェクト**をスキーマで分けて使う | `-SecretsFile ../template/.env` の共通参照、[実装記録](../../cast-evaluation/docs/lesson-implementation.md) |
| 署名鍵 | プロジェクトのJWKSは`EC`／`ES256`／`P-256`の1鍵（公開エンドポイントで確認） | `GET <SUPABASE_URL>/auth/v1/.well-known/jwks.json` |
| 基盤 | Spring Boot 4.1.2、Java 17、`spring-boot-starter-security`導入済み。Render free・Docker | [pom.xml](../../cast-evaluation/pom.xml)、[render.yaml](../../cast-evaluation/render.yaml) |

## 3. 公式情報から分かった制約

| 事実 | 設計への影響 |
|---|---|
| 非対称鍵の公開鍵は`/auth/v1/.well-known/jwks.json`で公開される。共有シークレットでのローカル検証は推奨されない。JWKSはエッジと各ライブラリで最大20分程度キャッシュされる | サーバーでJWKSを使ってローカル検証できる。DB照会や外部通信なしで毎回検証でき、前回のBasic認証のような重い照合にならない。鍵の失効は最大20分程度遅れて反映される |
| Spring Securityの`NimbusJwtDecoder`は既定で`RS256`だけを信頼する。JWKSは既定で5分キャッシュする | `ES256`を明示する設定が必要。`iss`（`https://<project>.supabase.co/auth/v1`）の検証も設定する |
| アクセストークンの既定有効期限は1時間。リフレッシュトークンは無期限だが1回限りの使用で、10秒の再使用猶予がある。それ以外の再使用はセッション全体の失効になる | サーバー側で更新処理を1か所にまとめる。並行リクエストで同じリフレッシュトークンを使った場合の挙動を試験する |
| ログアウトはリフレッシュトークンを全失効させるが、発行済みのアクセストークンは期限まで有効 | ログアウト時はCookieを消す。盗まれたアクセストークンは最大1時間有効、という限界を説明に含める |
| Supabaseの`postgres`ロールは`bypassrls`を持つ | **現在の接続ではRLSが利用者の分離に効かない。** 利用者ごとの制御は、まずサーバー側の認可で担保する |
| `user_metadata`（`raw_user_meta_data`）は本人が更新できる。権限情報は本人が変更できない`app_metadata`に置くよう公式が案内している | 権限判定に`user_metadata`を使わない |
| 新規登録を無効にすると、既存ユーザーだけがログインでき、新しいユーザーは招待でしか作れない。招待APIには`service_role`相当の権限が必要 | 登録を無効にし、管理者がユーザーを作る運用にできる。招待をアプリから送るなら秘密鍵をサーバーに置く必要がある |
| 組み込みのメール送信は全Auth機能の合計で1時間2通。独自SMTPを設定すれば変更できる | 招待・パスワード再設定メールを教材の基本操作にすると、すぐ上限に達する |
| メールのリンクを`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...`にしてサーバーで検証する方式がある | メールを使う段階では、サーバー側の確認用ルートとメール文面の変更が必要 |
| Freeプランは月50,000 MAU、有効なプロジェクトは2つまで、1週間使われないと一時停止。セッションのタイムアウト設定はProプラン以上 | 教材の規模では利用者数は問題にならない。教材ごとにプロジェクトを分ける案は、プロジェクト数の上限に当たる |
| Authのユーザーはプロジェクト単位 | **写真日記など他教材のために作ったアカウントでも、キャスト評価のログインには成功してしまう。** 教材ごとの利用許可が必要 |

## 4. 方式の比較

| 方式 | 内容 | 良い点 | 問題点 |
|---|---|---|---|
| **A（採用）** サーバー経由ログイン＋HttpOnly Cookie | Springがログインを仲介し、受け取ったアクセストークン・リフレッシュトークンをHttpOnly・Secure・SameSite=LaxのCookieに保存する。各リクエストでJWKSにより検証し、期限切れならサーバーで更新する | Thymeleafの画面構成とCSRFをそのまま使える。ブラウザーのJavaScriptがトークンを持たない。Renderが再起動してもログインが続く | Cookieからトークンを読む処理と、更新処理の実装が必要 |
| B サーバー経由ログイン＋Springのセッションだけ | ログイン時に1回だけSupabaseで確認し、以後はSpringのメモリ上のセッションで管理する | 実装が最も少ない | Render freeは休止・再起動でメモリが消えるため、そのたびに全員がログアウトされる。Supabase側での失効が反映されない |
| C ブラウザーでsupabase-js | ブラウザーでログインし、JWTを各リクエストでサーバーへ送る | Supabase公式の例が多い | 全画面にJavaScriptの認証処理が必要。トークンがJavaScriptから読める。現在の「必要な範囲のJavaScript」の方針から外れる |

Aを採用した。検証にはSpring Securityのリソースサーバー機能（JWKS・`ES256`・`iss`検証）を使い、Cookieからトークンを読む`BearerTokenResolver`を差し込む。Spring Boot 4ではスターター名が`spring-boot-starter-security-oauth2-resource-server`へ変わり、旧名は非推奨とされている。実装時にリリースノートで確かめる。

### Googleログインの流れ（サーバー側PKCE）

```text
ブラウザー → /login（Spring）
  Springがcode_verifierを作り、短命のHttpOnly Cookieへ保存
  → 302 <AUTH_URL>/auth/v1/authorize?provider=google&redirect_to=<アプリ>/auth/callback
         &code_challenge=...&code_challenge_method=...
  → Googleの同意画面 → Supabaseのコールバック（<AUTH_URL>/auth/v1/callback）
  → 302 <アプリ>/auth/callback?code=...
Spring：POST <AUTH_URL>/auth/v1/token?grant_type=pkce  {auth_code, code_verifier}
  → access_token・refresh_tokenをHttpOnly Cookieへ保存 → 利用許可表を確認 → /evaluation
```

- パラメーター名は公式JavaScriptクライアント（`GoTrueClient.ts`の`_getUrlForProvider`・`_exchangeCodeForSession`）で確認した。`code_challenge_method`の値（S256の表記）は実装時に開発用プロジェクトで確かめる。
- 更新は`grant_type=refresh_token`、ログアウトは`POST /auth/v1/logout`（[Supabase AuthのREADME](https://github.com/supabase/auth/blob/master/README.md)）。必要なヘッダー（`apikey`に公開キー）と`aud`クレームの値は、実装時に確かめてから検証へ加える。
- `code_verifier`のCookieは、ログイン開始から戻るまでの短時間だけ保持し、交換後に消す。公式の手順でも、このCookieが届かないとコードの交換に失敗するとされている。
- Google側には「ウェブアプリケーション」のOAuthクライアントを作り、承認済みリダイレクトURIへ**SupabaseのコールバックURL**（アプリのURLではない）を登録する。クライアントIDとシークレットはSupabaseのGoogleプロバイダー設定へ入れる。アプリには置かない。
- Supabase側では、Site URLと、リダイレクト許可一覧へアプリの`/auth/callback`（ローカル`http://localhost:8092`とRenderのURL）を登録する。

## 5. 認可：誰が何をできるか

**採用：教材専用の利用許可表で「このアプリの管理者」を判定する。** 検証では教材ごとの専用Authプロジェクトを使う（第9節）ため、他教材のアカウントが混ざる問題は起きにくくなる。それでも許可表を置く。新規登録を無効にしてもGoogleログインで新しいユーザーが作られないかは未確認で（第6節）、本番運用の構成も未定のためである。

```text
cast_evaluation.store_admins(user_id uuid PRIMARY KEY, display_name, created_at)
```

- ログインに成功しても、この表にないユーザーは「このアプリの利用権限がありません」と表示し、403で止める。
- 理由は3つ。(1) 同じプロジェクトの他教材のアカウントを締め出せる。(2) `user_metadata`は本人が書き換えられる。(3) `app_metadata`は管理APIでしか変えられず、変更がトークンの次回更新まで反映されない。表なら削除した直後から拒否でき、教材のSQLとしても説明しやすい。
- 最初は「管理者」1種類にし、全操作を許可する。オーナーと店長の区別、本人用画面は[事業仮説](../../../docs/05_business-hypotheses.md)で範囲外とされているので、今回は入れない。
- RLSは現状（`anon`・`authenticated`は全拒否）のまま変えない。利用者ごとのRLSを効かせるには、`bypassrls`を持たない専用ロールで接続し直す必要がある。これはFlywayの所有者・接続プール・他教材への影響を伴う別の作業として扱う。

## 6. 利用者の作成と復旧

採用：新規登録を無効にし、管理者がSupabaseの管理画面でユーザーを作る。招待メールは使わない。Googleログインのため、パスワードの発行・再設定は不要になる。

1. 管理画面で、管理者のGoogleアカウントと**同じメールアドレス**のユーザーを「確認済み」で作成する。
2. 作成したユーザーのIDを利用許可表へ追加する。
3. 本人がGoogleでログインする。Supabaseの自動ID連携は「同じメールの既存ユーザーがあれば、新しいIDをそのユーザーへ連携する」としていて、確認済みでないメールへは連携しない。

**最初の疎通で実測する点**：新規登録を無効にした状態で、(1) 事前に作ったユーザーへGoogleのIDが連携されてログインできること、(2) 管理画面で作っていないGoogleアカウントは「Signups not allowed」等で拒否され、ユーザーが作られないこと。公式文書に明記がないため、結果によって手順を直す。

メールを送らないので、組み込みメールの送信上限と、メールのリンクを受ける確認用ルートは不要。

## 7. 既存機能への影響と確認点

- **保護する範囲**：ログイン画面・その画面のCSS／JavaScript・`/healthz`だけを公開し、それ以外（評価、投稿、画像、CSVエクスポート、`/admin/*`、AI）はログインと利用許可を必須にする。画像やCSVの直リンクで中身が見えないことを確かめる。
- **速度**：前回は静的ファイルのたびにパスワードを照合し、約10秒かかった。今回の検証はローカルの署名確認だけだが、利用許可表の照会を画面ごとに何回も行わないようにする。12投稿・4画像の条件で、導入前後の画面応答と資産取得を比べる。
- **CSRF**：Cookieで認証するので、引き続き必須。ログイン・ログアウトもPOSTとCSRFトークンで行う。
- **期限切れ時の入力保持**：保存時にアクセストークンが切れていたらサーバーで更新して続行する。更新にも失敗した場合に入力をどう残すかを決める。既存の「セッション失効後も本文・画像・要求IDを保つ」要件と揃える。
- **ユーザー選択機能**：採用は「ログインとは別の投稿者データとして残す」。templateから引き継いだ投稿者の選択（`app_users`・`currentAuthor`）はデータもCookieも変えない。メニューでは、ログイン中の利用者（Googleアカウント名・ログアウト）と「投稿者の選択」を見出しで分け、本人認証と誤解させない。データ移行が不要で、変更が最小になる。
- **設定値**：Auth用のプロジェクトは、DB・画像のプロジェクトとは**別**になる。既存の`SUPABASE_URL`（Storage用）と名前を分け、`SUPABASE_AUTH_URL`・`SUPABASE_AUTH_PUBLISHABLE_KEY`等を追加する。JWKSのURLと`iss`はAuth用のURLから作る。秘密鍵とGoogleのクライアントシークレットはアプリに置かない。Renderの`render.yaml`と`.env`の例を更新する。
- **試験**：Javaの試験では`JwtDecoder`とSupabase Auth呼出しを差し替え、外部通信しない。Googleのログイン画面は自動操作を前提にできないため、ブラウザー試験では、ローカルの模擬認証サーバー（試験用の鍵で署名したJWTを返す`/authorize`・`/token`・JWKS）でログイン後の流れを確かめる。実Googleでのログインは、ユーザーのログイン済み通常Chromeで手動の受入として行う（GASの実環境受入と同じ分担）。受入では、未ログイン→ログイン画面、許可表にないユーザー→403、管理者→全操作、ログアウト、トークン期限切れ後の操作、画像・CSVの保護、PC／スマホを確かめる。
- **文書**：実装・受入後に、[educational-baseline](../../cast-evaluation/docs/educational-baseline.md)・[architecture](../../cast-evaluation/docs/architecture.md)・[render-deployment](../../cast-evaluation/docs/render-deployment.md)・AGENTS.mdの「認証なし」記述を書き換える。

## 8. 実装の段取り（案）

1. **決定**：完了（第9節、ADR 0004を更新済み）。
2. **Auth用プロジェクトとGoogleの準備**：キャスト評価用のAuthプロジェクトを作る。GoogleのOAuthクライアント（ウェブアプリケーション）を作り、Googleプロバイダーを有効にする。新規登録を無効にし、Site URLとリダイレクト許可一覧を設定する。管理者ユーザーを作る。
3. **疎通確認**：第6節の実測2点と、`/authorize`→`/token?grant_type=pkce`の交換を、アプリを作る前に確かめる。
4. **実装（キャスト評価）**：ログイン開始・コールバック・ログアウト、Supabase Auth呼出し、Cookieの読取り、JWT検証（`ES256`・`iss`）、トークン更新、利用許可表（Flyway V15）、保護範囲、メニュー表示の分離。
5. **ローカル試験**：模擬認証サーバーでの試験、第7節の項目と速度比較、実Googleでの手動ログイン。
6. **Renderでの受入**：公開先で同じ項目を確かめる。既存の公開データは消さない。
7. **順送り**：Auth用プロジェクトを削除する。確定した差分をtemplateへ戻し、次の教材で第2節から繰り返す。

## 9. 決定事項（2026-10-28、owner）

| # | 項目 | 決定 |
|---|---|---|
| 1 | 順番 | キャスト評価で先に実装し、templateへ戻す。ADR 0004を更新済み |
| 2 | ログイン方式 | **Googleログイン** |
| 3 | 利用者の作成 | 管理画面での作成のみ（新規登録は無効、招待メールなし） |
| 4 | 権限 | 管理者1種類 |
| 5 | ログイン状態の保持 | 方式A（サーバー経由＋HttpOnly Cookie） |
| 6 | ユーザー選択機能 | ログインとは別の投稿者データとして残し、表示で区別する（ownerの「推奨」指定を受けて決定。第7節） |
| 7 | プロジェクト | 1教材で疎通したらAuth用プロジェクトを削除し、次の教材で作り直す順送り。本番運用は別に決める |

### 決定7の解釈と確認待ち

ここでは決定7を次のように解釈した。違っていれば直す。

- Auth用プロジェクトは無料枠の2つ目として作り、Authだけに使う。DB・画像は今の共有プロジェクトのまま変えない。
- キャスト評価で疎通・受入したら、Auth用プロジェクトを削除し、次の教材用に作り直す。

確認待ち：

- **空き枠**：無料枠の有効なプロジェクトは2つまで。今の共有プロジェクト以外に空きがあるか。
- **削除後の公開先**：Auth用プロジェクトを削除すると、Render上のキャスト評価はログインできなくなる。そのまま閉じた状態にするか、認証を一時的に外すか。
- **作業の分担**：GoogleのOAuthクライアントの作成と、Supabaseのプロジェクト作成・プロバイダー設定には、ownerのGoogle／Supabaseアカウントでの操作が必要になる。CLI・APIで代行できる範囲は、着手時に確かめる。

## 10. 参照（確認日：2026-10-28）

- [Supabase：JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase：JWTs](https://supabase.com/docs/guides/auth/jwts)、[JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields)
- [Supabase：User sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase：Rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase：General configuration](https://supabase.com/docs/guides/auth/general-configuration)
- [Supabase：Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase：Email auth with PKCE flow for SSR](https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr)
- [Supabase：Pricing](https://supabase.com/pricing)
- [Supabase Auth README（エンドポイント一覧）](https://github.com/supabase/auth/blob/master/README.md)
- [Supabase：Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase：Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [supabase-js：GoTrueClient.ts（`/authorize`のパラメーター、`grant_type=pkce`）](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/GoTrueClient.ts)
- [Spring Security：OAuth 2.0 Resource Server JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)
- [Maven Central：spring-boot-starter-security-oauth2-resource-server](https://central.sonatype.com/artifact/org.springframework.boot/spring-boot-starter-security-oauth2-resource-server)
