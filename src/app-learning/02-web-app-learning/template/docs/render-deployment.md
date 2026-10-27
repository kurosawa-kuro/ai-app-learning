# Render公開・Gemini疎通の受入記録

2026-10-27（日本時間）。既存サービスを再開し、現在のWebテンプレートを公開した。

- URL：https://web-app-template-ofb7.onrender.com
- 実行コミット：`1250a8e`（Gemini基盤・モデル制限・永続要求管理・復旧整理を含む）
- デプロイID：`dep-dbg97m4s728c73dob8mg`。21:09:33にlive。
- ビルド先：`src/app-learning/02-web-app-learning/template`。既存のfree・Singaporeサービスを継続。
- DB：公開専用 `app_template_render`。Flyway V9まで適用。ローカルの投稿はコピーせず、公開先は独立データとして開始。
- 認証：環境共通のHTTP Basic。ユーザー名は `starter`、パスワードは手元の `.env` の `APP_ACCESS_PASSWORD` に保存。値をGitや本文に記載しない。
- `GEMINI_API_KEY` はRender環境変数へ登録し、ローカルとの一致を値を出さず確認。DB・Storage設定も反映した。

## 実確認

HTTPS、`/healthz` 200、匿名の投稿・管理・AI画面401、正しい環境認証で画面表示、DB・Storage正常、公開スキーマ表示を確認。CSRFなしの更新は401で拒否（CSRFフィルターがBasic認証処理より前に拒否する経路）。

管理画面からAI許可を一時的にONにし、固定短文の疎通を1回実行した。結果：

- 確認時刻：2026/10/27 21:14:04 JST
- モデル：`gemini-3.5-flash-lite`
- 成否：SUCCESS（画面に「接続できました」）
- 所要時間：14326ms
- 照会ID：`cd7fb131-d3f3-4a80-8616-120831f27491`

投稿・写真・ユーザー情報は送信していない。試験後、AI許可は元のOFFへ復元した。利用開始時は機能管理でAI連携を許可する。モデル許可は既定の1モデルを維持。実課金集計はダミー表示のまま。

## 再確認

`tests/render-acceptance.cjs` を使用。HTTPS URLを `RENDER_ACCEPTANCE_URL`、環境認証を `APP_ACCESS_USER`／`APP_ACCESS_PASSWORD` へ設定して実行する。`RUN_RENDER_GEMINI=true` を明示した場合のみ実AIへ固定短文を送る。通常はアクセス確認だけを行う。

キーやパスワードをコマンドへ直書きせず、`scripts/Read-DotEnv.ps1` から読み込む。ログと画面記録は `.local/render-acceptance-result.log`・`.local/render-acceptance/`（Git対象外）。公開中のサービスは停止せず維持する。

デプロイ中は二重ビルド防止のため自動デプロイをOFFにし、記録のpush後に元のONへ戻す。今回の追加Blueprint宣言と受入スクリプトは稼働アプリのコードを変更しない。
