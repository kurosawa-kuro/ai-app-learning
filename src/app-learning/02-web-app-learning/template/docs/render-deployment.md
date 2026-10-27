# Renderへの教材公開

このテンプレートはログイン・Basic認証なし。ユーザー作成／選択は投稿者データの操作であり、認証機能ではない。

## 設定

RenderのRoot Directoryは `src/app-learning/02-web-app-learning/template`、Dockerfileは `./Dockerfile`。ローカルDockerは不要。DB接続、Storage、必要時のGeminiキーを環境変数へ設定する。秘密値をGitへ置かない。

`.env` のRENDER_API_KEYを使い、`./scripts/render.sh env` でDB・Storage・Geminiの設定を反映する。APP_ACCESS_USER／APP_ACCESS_PASSWORD／APP_ACCESS_MODEは使わない。既存サービスに残っている場合は削除する。

コードをテストしてGitへpushすると、現在のサービスでは自動デプロイされる。手動の状態確認は `./scripts/render.sh status`、明示デプロイは `./scripts/render.sh deploy`。

## 公開先の受入

```powershell
$env:RENDER_ACCEPTANCE_URL='https://web-app-template-ofb7.onrender.com'
node tests/render-acceptance.cjs
node tests/render-visual.cjs
node tests/render-performance.cjs
```

- ログインなしで投稿・管理画面が開けること。
- 全CSSのHTTP200／text/css、入力部品へのPico適用。
- 12件以上の架空投稿、縦長・横長・正方形の4画像、2ページ目。
- PC・スマホの表示、画像デコード、ページャー、ユーザー切替、横はみ出しなし。
- CSRFなし更新は403。AI実APIは通常検証で呼ばず、明示指定時だけ実行する。
- 起動直後の遅さを隠さず、稼働後・画像取得・再訪を分けて記録。

サービス：web-app-template、URL：https://web-app-template-ofb7.onrender.com 。デプロイごとの完了状況は[最小構成](educational-baseline.md)と[性能記録](performance-validation.md)を参照。
