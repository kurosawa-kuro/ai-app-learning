# 開発・検証スクリプト

npmコマンドは src で実行する。Node.js 20以上と npm install が必要。
各スクリプトの --help で引数を確認できる。直接 node で実行する場合も出力先は src 基準。

| コマンド | 内容・副作用 |
|---|---|
| npm run build:data | env の設定・作例・文体を検証し、生成JSを更新する。全入力の検証後に書き込む |
| npm run check:data | 生成JSが正本と一致するか確認。書き換えない |
| npm run doctor | Node・依存関係・GAS公開設定・生成物の一致を確認 |
| npm run check | doctor相当＋全単体テスト＋AI要求構築。最初の失敗で停止 |
| npm run check -- --browser | 上記にブラウザ受入・画像読込テストを追加。Playwrightのブラウザ導入が必要 |
| npm run benchmark:db | 模擬DBのcold/warm時間・Sheets読込回数・キャッシュ有無を計測 |
| npm run verify:openai -- --dry-run | 4ケースのAI要求構築のみ。秘密ファイルもネットワークも使用しない |
| npm run verify:openai -- G3a_text | 明示的な実API検証。OpenAIへの送信・課金が発生し得る |

checkは生成物を自動更新しない。差分があれば build:data → 差分レビュー → check の順に進める。
結果は test-results/local-check.json に残す（終了コード0が成功、1が失敗）。
ベンチマークは test-results/db-refactor-benchmark.json に残す。
性能の時間値はNode上の模擬実行で、GASの通信時間・Drive・OpenAIの応答速度ではない。
実環境の診断・性能計測は server/controllers/setup.js の入口を使う。

実API検証のケースは --list で確認できる。固定の作例画像・タグと設定された文体ルールを送信する。
env/secret.yaml の openai.api_key を読み、キー・本文・応答本文をログへ出さない。
実レスポンスをローカルのGAS模擬環境で検証するため、実SheetsやDriveには書き込まない。
通常のcheckとnpm testでは実APIを呼ばない。

これらの成功は公開環境の疎通・認証・DB移行の成功を保証しない。
公開反映は既存のリリース手順に従い、別途 show-file-status → push → deploy を行う。
