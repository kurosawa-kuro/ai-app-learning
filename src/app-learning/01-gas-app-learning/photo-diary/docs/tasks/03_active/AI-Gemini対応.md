# AI・Gemini対応 — 調査と実装方針

> 2026-10-28 状態整理：本文は旧方式・当日の作業履歴。DB v2移行・公開更新は完了し、現在@20で写真・OpenAI下書き・保存・再表示を確認済み。旧Gemini案は廃止。性能実測・復旧試験など、個別の未確認事項まで完了とはしない。 現在の確認済み事項・残作業は[5教材の受入記録](../../../../../docs/tasks/gas-release-20261028.md)を参照。

調査日：2026-10-24（Asia/Tokyo）。現在の状態：G1/G2確認済み、G3a〜G4bを実装・反映済み。実API作例4ケース成功。公開画面の検証は残る。調査時点の記述と、その後の着手・実行記録を分けて読む。ユーザー回答により無料枠。

## 結論

## 作業順と現在地

G3a〜G4bの実装・ローカル検証・GAS反映は実施済み。最新の確認済み範囲と残る実環境検証は [実装・検証管理](README.md) を正とする。以下の計画・調査時点の記述は、末尾の実装記録と区別する。

## 結論

GASサーバーからGemini Developer APIへRESTで接続し、既存の `generateDraft` を保って `GeminiDraftProvider` を追加する方式を推奨する。認証準備 → 「こんにちは」程度の最小推論 → 日記向け推論の順に段階を分ける。画像理解は画像側の完成を待つ後続段階とする。

「GASと同じGoogleアカウント」はAI Studioのプロジェクト・キー管理にも同じ所有者を使う運用で実現できる。ただしGASへのログインだけでGemini APIが利用可能になるわけではなく、APIの認証と利用プロジェクトの設定が別に必要。現在の公式資料ではAI Studioで新規発行するキーはauthorization keyとなり、無制限のstandard keyを前提にした古い手順は使わない。[APIキー公式資料](https://ai.google.dev/gemini-api/docs/api-key)

## 現状と不足箇所

| 現状のコード | 調査結果 |
|---|---|
| `src/server/services/draft/draft-service.js` | 入力IDを検証し、写真の表示情報とタグをproviderへ渡す。現在はmockだけ登録 |
| `mock-draft-provider.js` | `generate({ photos, tags }) → { title, body, mock }`。固定文を返す |
| `src/client/views/form.html` | AI下書きボタン、待機表示、上書き確認、失敗時の入力保持がある |
| `src/server/services/photo/photo-service.js` | view / catalog / exists / maxPerPostだけ。画像バイトの取得契約はない |
| `src/scripts/build-data.mjs` | configの特定項目だけを生成。ai設定をYAMLへ足すだけではGASへ届かない |
| `env/diary-preferences.md` | 調査開始時は空。現在のビルドはこのファイルを読まず、GASにも送らない |

写真の `file_id` や表示用URLを送るだけでは実写真の解析にならない。Geminiへ渡す画像取得処理が必要で、既存のダミー写真からの生成を画像理解として表示してはいけない。

## 推奨構成

```text
form → App.api.generateDraft → controller → DraftService
  → PromptBuilder（選択タグ・許可した個人設定・必要なら画像）
  → GeminiDraftProvider → GeminiClient（UrlFetchApp）→ Gemini API
  → 応答検証 → { title, body, mock: false } → 編集可能なフォーム
```

- 通信はGAS内に閉じ、ブラウザへAPIキーを渡さない。Node SDKをGASの共有大域へそのまま持ち込まず、RESTを使う。
- `UrlFetchApp` は `script.external_request` 権限を使う。現在のmanifestは明示的なoauthScopesを持たないため、実装後に検出された権限と再承認の要否を確認する。[UrlFetchApp](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)
- providerは返却契約を維持するが、生成結果を `String(undefined)` で通さないようDraftService側も検証する。
- API呼び出しはシート書き込みロックの外で行う。AIが失敗しても手入力・通常保存は使える状態を維持する。

## 認証・設定・個人カスタマイズ

| 値 | 推奨配置 | 注意点 |
|---|---|---|
| GEMINI_API_KEY | GAS Script Properties | ソース・生成JS・CONFIG・ログに出さない。プロジェクト編集者から秘匿できる専用vaultではない |
| モデルID・出力上限・有効フラグ | env/config.yaml → build:data → Settings | build-dataの検証と生成、テストを同時に拡張 |
| 文体・長さ・禁止事項 | env/diary-preferences.md | 実在の個人情報は推測して埋めない。現在は実行時に未接続 |
| 実行時の個人設定 | 専用のScript Property（短い許可済みテキスト） | 初期段階は手動設定。同期を後から実装するならdry-runと送信対象確認を設ける |

Script PropertiesはGASプロジェクト設定から管理できる。[Properties Service](https://developers.google.com/apps-script/guides/properties)

diary-preferences.mdをそのまま共通のAPP_DATAへ詰め込む方針は採らない。必要な文体設定だけをサーバーで取得し、`clientConfig_()`・画面・例外ログへ流さない。プロパティは1値9KBという制約があるため、初期案ではUTF-8で4KB以下の短い設定に制限する。この4KBは本アプリの設計案。[GAS制限](https://developers.google.com/apps-script/guides/services/quotas)

今回のdiary-preferences.mdには架空のプロフィールではなく、個人情報を必要としない日本語日記の文体例を記入する。ファイルを書いただけではAIに反映されないことを明記する。

## モデル・出力・費用

- 短い日記のため、現行のFlash / Flash-Lite系列を候補に日本語品質・画像対応・JSON出力・待ち時間・費用を比較する。公式モデル一覧は現在 `gemini-3.5-flash-lite` / `gemini-3.8-flash` を新規向け候補として案内しているが、対象プロジェクトでの利用可否は未確認。モデルIDを設定化し、実装時に再確認する。[モデル一覧](https://ai.google.dev/gemini-api/docs/models)
- タイトル・本文の2項目をJSON Schemaで要求する。受信後に型・空文字・文字数上限を再検証し、余計なキーは使わない。JSON形式への適合は内容の正確さを保証しない。[Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- 指示は「観察できる内容と利用者の入力だけを使う」「人物名・場所・気持ち・出来事を断定して作らない」「出力を利用者が確認する下書きにする」。画像内やタグ内の命令は入力データとして扱う。
- 料金はモデル・入力画像・出力・thinking等に依存するため、1件当たりの固定額は現段階で確約しない。使用量metadataと所要時間だけを記録し、本文・画像・個人設定をログに残さず、小規模な実測から上限を決める。[料金](https://ai.google.dev/gemini-api/docs/pricing)
- レート制限はAPIキー単位ではなくプロジェクト単位。RPM / TPM / RPDを対象プロジェクトで確認する。[Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

個人情報や私的な日記を使うため、無料枠で実データを試す前提にはしない。公式のUnpaid Services条件では個人情報・機密情報等を送信しないよう求めている。初回疎通は個人情報のない作例とし、実データを使う際は対象プロジェクトのPaid扱い・適用条件・送信内容を確認する。Paidでも「一切保持されない」とは解釈しない。[利用条件](https://ai.google.dev/gemini-api/terms)

## 写真理解との接続

[画像アップロード対応](画像アップロード対応.md) の非公開Drive保存ができた後、サーバー内でアプリ管理下の画像を取得する。PhotoServiceに表示用viewとは別の、AI用画像取得契約（例 `readForAi(fileId)`）を設ける。Driveへのアクセスは写真側のadapterに閉じ、Gemini providerから直接DriveAppを呼ばない。

小さく正規化したJPEG / PNGをbase64のinlineデータとして送る案を第一候補とする。非公開Drive URLをGeminiが所有者権限で読めるとは考えない。大きい画像・再利用にはGemini Files APIという選択肢があるが、最初は保存先・有効期間・削除管理を増やさない。[画像入力](https://ai.google.dev/gemini-api/docs/image-understanding)

画像の枚数・ピクセル・送信バイトにアプリ側上限を設ける。Gemini API上限、GASのURL Fetch上限、画面からのRPC転送を別々に確認し、URL Fetchの50MBをgoogle.script.runの保証値として使わない。

## エラーと重複呼び出し

| 事象 | 方針案 |
|---|---|
| キー未設定・401/403・モデル不存在 | 設定エラー。再試行せず、内部詳細を伏せて利用者へ通知 |
| 429 | 回数制限。自動連打をせず、時間を置く案内。アプリの日次上限も別途実装 |
| 5xx・通信失敗 | 入力を保持。必要なら上限付きで1回だけ再試行するが、API側で処理済みの可能性を考慮 |
| 安全性ブロック・候補なし・出力途中終了 | 成功にせず、手入力へ戻れる文言を表示 |
| JSON不正・空・文字数超過 | サーバーで拒否。勝手に保存しない |

初期実装は自動再試行なしを推奨。下書き用requestIdと短期結果再利用を検討するが、APIとGASをまたぐ完全な一度きり実行・課金防止は保証できない。UrlFetchAppに未確認のtimeout指定を追加せず、GAS実行上限と別にUIの待機表示・離脱後の結果破棄を設計する。

## 実装Phase（段階分けを優先）

各Phaseは個別の実装・検証単位とする。前段の完了条件を満たしてから次へ進み、認証エラーと推論品質の問題を同時に調べない。G2は完了。G3以降は実装済み・公開画面の検証待ち。

| Phase | 到達点 | 依存 |
|---|---|---|
| G1 | Geminiのアカウント・API認証準備 | なし |
| G2 | 「こんにちは」程度の最小推論がGASから返る | G1 |
| G3a | キーワードから日記のタイトル・本文を生成 | G2 |
| G3b | 文体・個人カスタマイズを適用 | G3a |
| G4a | 静止画1枚を踏まえた日記生成 | G3b＋画像P2b |
| G4b | 複数画像を踏まえた日記生成 | G4a＋画像P3 |

### G1：アカウント・API認証準備

**目的**：どのアカウント・プロジェクト・認証情報で呼ぶかを固定する。

- GASの所有者と同じGoogleアカウントでAI Studioの対象プロジェクトを確認する。
- APIキーを用意し、GASのScript Propertiesへ設定する。キー値をコード・画面・ログに出さない。
- 利用モデル候補、課金状態、利用上限を確認する。GASからの外部通信に必要な権限も準備する。
- この段階では下書きproviderの切替、diary-preferences.md接続、画像送信を行わない。

**完了条件**：対象プロジェクトと設定項目を記録し、サーバー側でキーの存在だけを確認できる。認証情報を配置しただけではAPI認証成功とは報告しない。実際にキーが有効かはG2の応答で確認する。

### G2：最小推論の疎通

**目的**：日記仕様を入れる前に、認証・通信・応答を一往復で確認する。

- GASエディタから実行する診断用入口 `testGeminiHello` と、再利用できる最小のGeminiClientを作る。末尾 `_` は実行一覧に出ないため入口には付けない。入口はログ出力のみで戻り値なし。通常画面からは接続しないが、公開関数になるため現在の MYSELF 公開設定を維持する。
- 固定入力「こんにちは。短く挨拶を返してください」のみを送る。個人情報・タグ・写真・JSON Schemaを加えない。
- 応答のテキスト、利用モデル、所要時間、取得できる使用量を確認する。キーやリクエストヘッダーはログに出さない。
- 失敗時はキー未設定、認証・権限、モデル、回数制限、通信を区別する。自動再試行は入れない。

**完了条件**：実APIから空でない短い挨拶が返る。厳密な文言一致は要求しない。キー未設定等の失敗も判別でき、通常の日記画面はmockのまま動く。ここで初めて実APIでの認証成功を記録する。

### G3a：今回の目的に合う日記推論

**目的**：挨拶の疎通を、編集して保存できる日記下書きへ発展させる。

- GeminiDraftProviderを追加し、G2の通信部分を再利用する。
- 選択タグを入力にし、タイトル・本文を構造化出力で要求する。空文字・型・文字数をサーバー側で検証する。
- 既存generateDraftとフォームに接続し、待機・上書き確認・失敗時の入力保持・mock切替を確認する。
- 写真はこの段階では解析しない。写真だけを選んだ場合にはキーワードが必要と案内し、ダミー画像を解析したように振る舞わない。
- 評価用の個人情報を含まないキーワード例を複数用意し、事実を作りすぎないか、編集しやすい文章かを確認する。

**完了条件**：キーワード → タイトル・本文 → 手直し → 保存 → 詳細確認が通る。生成失敗でも手入力で保存でき、API認証成功だけを日記機能完成と扱わない。

### G3b：文体・個人カスタマイズ

- env/diary-preferences.mdから反映してよい項目を決め、サーバー側設定へ反映する。初期は手動で設定し、自動同期は後回しにできる。
- 同じ入力で設定の有無を比較し、文体・長さ・禁止事項の変化を確認する。
- 実在の個人情報を必要としない文体例から始める。設定を初期HTMLや通常ログへ露出しない。

**完了条件**：文体設定が反映され、設定が空でも生成できる。個人設定の反映と生成内容の確認を分けて記録する。

### G4a / G4b：写真を使う日記推論

- G4aは画像P2bの1枚保存・非公開取得が完了してから行う。PhotoServiceのAI用取得契約を加え、選んだ1枚だけを送る。
- G4bは画像P3の1対多対応後に行い、複数枚の順序・合計容量・一部取得失敗を検証する。
- 写真の視覚情報と入力タグを使い、分からない人物名・場所・気持ちを断定しない。

**完了条件**：1枚、次に複数枚の実画像を踏まえた下書きを編集・保存できる。画像取得失敗を黙って成功扱いせず、キーワードのみで続ける場合は利用者が分かるようにする。

### 変更対象と検証の切り分け

G1は接続設定と認証確認、G2は最小通信・診断、G3aはprovider・DraftService・出力検証・フォーム、G3bは個人設定adapter、G4は画像取得契約を主対象とする。config/settings.js・build-data.mjs・env/config.yamlは必要なPhaseで項目を追加し、毎回関連テストを通す。Phaseごとに実行した証跡と未実行項目を残す。実機確認にGAS反映が必要な場合も、そのPhaseの最小変更だけを反映する。

## テストと着手前の判断

自動検証：成功JSON、壊れたJSON、長さ超過、401/403/429/5xx、ブロック、候補なし、キー非露出、画像以外の拒否、入力を保った失敗、mockへの切替。テストは通信stubを使い、有料APIを毎回呼ばない。

実機検証：所有者アカウントでの再承認、1回の生成、待機中の重複押下、通信失敗後の再試行、下書き編集→保存。ブラウザとGASログに秘密・画像が出ないことも確認する。

未決：APIプロジェクトと利用可能モデル、課金・回数上限、送信してよい個人設定、写真も送る段階。今回それらのアカウント状態・課金・キーは閲覧していない。アプリ本体の変更とデプロイは調査範囲に含めていない。

## 元の依頼

今AI機能はダミー、モックにしているので、実際にGeminiに切り替えて連携したい
GASと同じGアカウントで

個人情報のカスタマイズはここで管理予定
C:\Users\owner\.ssh\dev\ai-app-learning\src\app-learning\01-gas-app-learning\photo-diary\env\diary-preferences.md

適当に書いておいてください。

調査、方針書き出し先 C:\Users\owner\.ssh\dev\ai-app-learning\src\app-learning\01-gas-app-learning\photo-diary\docs\tasks\02_backlog\AI-Gemini対応.md

## G1 着手記録（2026-10-24）

- GAS/claspの対象アカウントはkurosawa8122@gmail.comと確認済み。AI Studio側のログイン・プロジェクト・課金状態は未確認。
- `server/controllers/setup.js` の `checkGeminiSetup` を追加してGASへpush済み。GEMINI_API_KEYの設定有無だけを確認し、値を返却・ログ出力しない。APIの呼出しや推論は行わない。
- キー未設定・設定済みの区別、秘密値の非露出、API認証未検証の明示を含め全52テスト成功。
- 着手時の残りだったGAS Script PropertiesへのGEMINI_API_KEY設定とcheckGeminiSetup実行は、下記の実行結果で確認した。キーをチャット・env/diary-preferences.md・生成コードへ記入しない。
- キーの有効性はG2で別途確認する。課金変更・実推論・公開デプロイ更新は行っていない。


### 2026-10-24：エディタ実行入口の修正

末尾アンダースコアの内部関数が実行一覧に表示されなかったため、末尾アンダースコアなしの実行入口を追加した。診断結果はログにのみ出力し、公開入口からは返さない。全53テスト成功、43ファイルをGASへpush済み。公開版は再デプロイしていない。

### G1 キー保存確認（2026-10-24 23:10 JST）

ユーザー提供画像で、AI Studioのキー作成画面にキー名・選択プロジェクトともに `ai-photo-diary` と表示されていることを確認。その後、GASの `checkGeminiSetup` 実行ログで正常終了、`ok: true`、`code: key_configured_not_validated`、`keyConfigured: true` を確認した。GASへのキー保存と確認関数の実行は完了。

`apiAuthenticationVerified: false`、`inferenceExecuted: false` のため、API認証成功・推論成功とは扱わない。保存されたキーとAI Studioプロジェクトの対応、AI Studioのログインアカウント、対象プロジェクトの課金状態は未検証。G2の最小推論に進む際に確認する。キー値は本記録に含めない。


## G2 実装記録（2026-10-24）

- GeminiClientを追加し、generateContentへ固定の挨拶を1回送信するGeminiProbeと、エディタ実行入口 testGeminiHello を実装。通常の日記providerはmockのまま。
- APIキーはScript PropertiesのGEMINI_API_KEYだけから読み、ヘッダーへ設定する。ローカルsecret.yamlの自動同期は行わない。
- G2診断用モデルはScript PropertiesのGEMINI_MODELで変更可能。未設定時はgemini-3.5-flash-lite（公式モデル一覧を再確認）。出力上限256トークン、受信本文上限1000文字。G3のアプリ設定へ接続する際はenv/config.yamlとビルド・Settingsを拡張する。
- HTTP失敗、通信・GAS権限エラー、不正JSON、空応答、ブロック、途中終了を分類。自動再試行・リダイレクト追従なし。生のエラー本文とヘッダーはログに出さない。成功時は挨拶・モデル・所要時間・許可した使用量項目のみ記録。
- npm test：全58件成功。送信対象45ファイルを確認し、GASへpush成功。公開デプロイ@12は更新していない。
- GASエディタでtestGeminiHelloを実行し、下記の実API応答を確認した。G2は完了。
- 失敗時：missing_api_keyは設定、authentication_error / permission_deniedはキー・権限、model_not_foundはモデル、quota_exceededは対象プロジェクトの利用枠を確認する。invalid_request_or_keyは要求またはキーの問題であり、この結果だけで原因を断定しない。課金を自動で有効化しない。

参照：[GenerateContent API](https://ai.google.dev/api/generate-content)、[公式モデル一覧](https://ai.google.dev/gemini-api/docs/models)。


## G2 完了記録（2026-10-24 23:18 JST）

ユーザー提供のGAS実行ログ画像で、testGeminiHelloの正常終了と以下を確認した。

- ok: true / code: generation_succeeded
- モデル：gemini-3.5-flash-lite
- 応答：こんにちは！よろしくお願いします。
- elapsedMs: 5582（約5.6秒）
- promptTokenCount: 9 / candidatesTokenCount: 4 / totalTokenCount: 13
- apiAuthenticationVerified: true / inferenceExecuted: true

GASからGemini APIへの認証・通信・最小推論が成功し、G2の完了条件を満たした。失敗分類はローカルのスタブテストで検証済みで、実APIで意図的な失敗試験は行っていない。通常の日記生成はmockのまま、公開デプロイは@12のまま。G3a（キーワードから日記生成）は未着手。成功ログだけでは課金状態・利用上限・キーの所属プロジェクトとの対応まで検証したとは扱わない。


## G3a〜G4b 実装・反映記録（2026-10-24）

G3a→P2a→P2b→G3b→G4a→P3→G4b→P4の実装を進め、全72テスト成功。56ファイルをGASへpushし、既存デプロイを@13へ更新した。前Phaseのローカル検証を通し、実環境の確認が待ちになった項目は完了とせず、独立して実装可能な次の範囲を進めた。確定仕様・変更対象の責務・運用手順は [写真・Gemini連携仕様](../../specs/photo-gemini-integration.md) に反映した。

GeminiDraftProvider、JSON Schemaと受信後の再検証、設定化したモデル・出力上限、限定した文体設定の生成、実画像1枚／複数枚のinline送信、無料枠の送信確認UIを実装。ローカルからの実API検証はG3a 5032ms・G3b 5250ms・G4a 5379ms・G4b 7986msでHTTP200。タイトル／本文の型と長さも検証。一時的な503は失敗として扱い、後の明示実行で確認した。秘密や本文は診断ログへ出力していない。GAS公開画面での確認とは区別する。

### 追加のブラウザ検証

`npm run test:browser`で実ChromiumのPC幅・スマホ幅の2ケース成功。同意なしの拒否→同意→下書き入力→手直し→保存→再読込で本文保持まで確認した。この試験のGemini応答・GAS通信は模擬で、実APIの成功証跡とは別。公開環境を接続した確認は[管理表](README.md)の残件1に集約する。
