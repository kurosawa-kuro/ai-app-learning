# Renderへの教材公開

このテンプレートはログイン・Basic認証なし。ユーザー作成／選択は投稿者データの操作であり、認証機能ではない。

## 設定

RenderのRoot Directoryは `src/app-learning/02-web-app-learning/template`、Dockerfileは `./Dockerfile`。ローカルDockerは不要。DB接続、Storage、必要時のOpenAIキーを環境変数へ設定する。秘密値をGitへ置かない。

`.env` のRENDER_API_KEYを使い、`./scripts/render.sh env` でDB・Storage・OpenAIの設定を反映する。APP_ACCESS_USER／APP_ACCESS_PASSWORD／APP_ACCESS_MODEは使わない。既存サービスに残っている場合は削除する。

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

## V10の公開切替（2026-10-27）

通常の自動デプロイは旧版と新版が重なる。非互換なDB移行ではそのまま使わない。今回は自動デプロイを一時停止し、サービス停止を確認して切り替えた。

Render APIはsuspend中のdeployを拒否し、resumeは最後の稼働版・設定を再起動した。Docker Commandを変更してもresume時には反映されなかった。このため、DBは変更しないまま再停止し、切替中だけ `app_settings` の初期INSERTを新接続識別子のクライアントに限定する一時トリガーを設けた。旧版の起動時INSERTが拒否され、新版だけ許可されることをDBで確認した。

新版は一時的にJDBCのApplicationNameを `template-v10-cutover` として起動し、Flyway V10を適用。切替後に一時トリガー・関数・接続URLの上書きを解除済み。テンプレートへメンテナンス機能・認証・監視基盤を追加する対応ではない。同じDDLを無条件に次の移行へ使い回さない。

Renderの通常デプロイと旧版の継続稼働は[公式のデプロイ手順](https://render.com/docs/deploys#zero-downtime-deploys)を参照。
