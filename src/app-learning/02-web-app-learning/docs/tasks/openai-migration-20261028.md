# Web教材のOpenAI移行（2026-10-28）

## 現行仕様

Web版のAIはOpenAI Responses APIを使う。既定モデルは `gpt-4.1-mini`。
対象はテンプレート、写真日記、英語、スキルじゃんけん。ショップ・キャスト評価にはAI機能を追加しない。コピーされた共通基盤の接続処理だけは全6アプリで揃える。

- ローカルはGit対象外の `.env`、Renderはサービスの環境変数に `OPENAI_API_KEY` を設定する。ブラウザーには渡さない。
- `OPENAI_MODEL=gpt-4.1-mini`。今回の公開環境は `OPENAI_TIMEOUT=30s`（コード／環境変数例の既定値は20秒）。モデル名は管理画面の許可一覧にも必要。
- AI許可スイッチ・明示操作・CSRF・連続送信制限を維持。起動時や画面表示だけではAIを呼ばない。
- 写真はResponses APIの `input_image`、文章は `input_text`。`store:false` で要求し、アプリ側にAIの永続台帳は作らない。
- Gemini／GCP OAuthへのフォールバックはしない。失敗時の自動再試行もしない。
- AI下書きの反映／破棄、英語の採点／会話／振り返り、じゃんけんのセリフ事前生成という教材の範囲は変えない。

## DB移行

既存Flyway V1〜V13は変更しない。V14でGemini用の許可モデルを削除し、モデル名制約をGPT形式へ変更して `gpt-4.1-mini` を登録する。投稿・画像・タグ・学習履歴・対戦履歴・ユーザー・AI許可スイッチは保持する。

旧Geminiコードは新しいモデル制約に対応しないため、V14適用後に旧版だけを再デプロイしない。

## 確認状況

**今回のOpenAI移行は完了。** 全6サービスは `cdefa83dd505c0cf8587d1b487a096c2ac89f0ef` でlive。旧Gemini環境変数を削除した状態で更新済み。最終版でもPC 1440px・スマホ390px、CSS、画像デコード・枠内表示、OpenAIモデル設定を確認した。

- ローカル実API疎通：成功（gpt-4.1-mini）。
- 全体テスト：template 76件、写真日記80件、英語80件、じゃんけん80件、ショップ78件、評価78件。計472件中466件成功、実API用6件は通常実行ではスキップ。失敗0。ローカル実APIは別途1件成功。
- 旧V9データを入れて最新V14へ移行するテストで、投稿・アイコン・設定・旧履歴の保持とGPT許可モデルへの変更を確認。
- `1168e83` をRender全6サービスへ公開。AI利用対象4サービスの画面から実OpenAI疎通に成功。所要時間はtemplate 2,588ms、写真日記2,947ms、英語3,393ms、じゃんけん3,843ms。これはAI接続確認の所要時間であり、ページ表示速度の測定ではない。
- 写真日記：架空画像3枚を使いAI下書き→本人の手直し→2タグ・保存→再読込・画像表示を確認。
- 英語：実AIのクイズ採点・会話・振り返りと履歴保存を確認。
- じゃんけん：実AIのセリフ生成→手直し・採用→対戦・履歴を確認。対戦時のAI再呼出しは0回。
- 全6サービスで公開画面・CSSのHTTP200／text/css・フォームのスタイル適用・CSRFを確認。PC／スマホのスクリーンショットを取得。
- Renderの旧 `GEMINI_API_KEY`／`GEMINI_MODEL`／`GEMINI_TIMEOUT`／`AI_GEMINI_API_KEY` を削除。ショップ・評価にはOpenAIキーを追加していない。

## 画面検証で見つかった修正

写真日記のスマホ表示で、240pxの画像枠から縦長画像400px・正方形画像306pxがはみ出した。Gridの最小サイズを0に固定し、画像の最小サイズも0として枠内に収めた。縦横比を保ち、トリミングしない。共通CSSを全6アプリへ反映し、日記の受入テストに画像矩形が枠内に収まる検査を追加した。修正コミットは `cdefa83`。

## 証跡と再確認

- 各アプリの `target/surefire-reports/`：Javaテスト結果。
- 全6アプリの `.local/render-acceptance/final-1440.png`／`final-390.png`：最終公開版のPC／スマホ。写真日記の縦長・正方形も枠内表示。
- 各AIアプリの `.local/render-acceptance/openai-success.png`：公開先の実疎通。
- 日記 `test-results/diary-desktop.png`／`diary-mobile.png`、英語 `learning-mobile.png`、じゃんけん `janken-mobile.png`：公開先の教材操作。
- `RENDER_ACCEPTANCE_URL` と `RUN_RENDER_OPENAI=true` を設定し、各アプリの `node tests/render-acceptance.cjs` で明示的に再確認できる。実APIを1回呼び、AI許可スイッチは元の状態に戻す。
- `tests/diary-acceptance.cjs`／`learning-acceptance.cjs`／`janken-acceptance.cjs` は架空データを追加する受入テスト。キーはログ・スクリーンショット・Gitへ含めない。

## 作業時の失敗と再発防止

- V9移行試験の入力をGPT形式へ一括置換すると、歴史的なV10のGemini形式制約に違反する。旧版の入力はGemini形式のままにし、最新へ移行した後の期待値をGPT形式にする。過去のSQLを書き換えて通さない。
- Supabase Session poolerのこの環境の上限は15接続。6アプリのDBテストや、新旧インスタンスが重なるデプロイを同時実行すると `EMAXCONNSESSION` になる。実際に並列テストと2回目の同時デプロイで失敗した。DBテストは直列で全件成功。公開更新も1サービスのlive確認後に次へ進む。教材へ新しい監視基盤は追加せず、接続上限の増額で解決したことにもしない。

過去のGemini検証記録は当時の証跡であり、現在の接続手順ではない。この文書と各アプリのREADME／環境変数例を使う。
