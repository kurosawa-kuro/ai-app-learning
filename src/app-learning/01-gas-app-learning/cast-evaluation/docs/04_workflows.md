# CR版の作業手順

1. README・AGENTS・現行CR仕様を確認し、Create／Readの範囲を固定する。
2. `npm ci`、`npm test`で保存と業務ルールを確認する。
3. `npm run dev`でローカル確認。ブラウザテスト時は停止する。
4. 初回だけ`npx playwright install chromium`。`npm run test:browser`でPC／スマホを確認し、test-resultsのスクリーンショットを開く。
5. `npm run format`、`npm run format:check`とGit差分を確認する。
6. [公開手順](08_release_runbook.md)で実GASへ配置し、ローカルとは別に受入する。

Makefileは雛形。Node/npmは開発検証専用。GASにnode_modulesやテストをアップロードしない。
