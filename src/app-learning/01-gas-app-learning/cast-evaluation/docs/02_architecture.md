# CR版の構成

`index.html / app.html` → `bridge.html`（google.script.run）→ `web.js`（rpc）→ `application.js`（業務処理）→ `store.js`（Sheets）。

- ドメインごとの処理はapplication.jsにまとめ、表定義・初期データもここで確認できるようにする。
- rpcは明示した操作だけを許可し、ScriptLockで読書き中の競合を防ぐ。
- store.jsは列を検証して読取り・追記する。列・表の不一致を自動修復しない。
- UIは1ページ内に入力と結果を置く。Pico CSSを同梱し、外部CDNに依存しない。
- 小さな保存・通信・表示処理は2教材で揃える。共通サーバー、独自フレームワーク、大量のクラスは追加しない。

ローカルではtests/gas-harness.cjsがGAS APIを模擬する。scripts/dev-server.cjsは127.0.0.1限定、メモリ内で保存し、停止で消える。実GASはHtmlServiceとSheetsを使うため、ローカル検証だけでは公開受入にならない。
