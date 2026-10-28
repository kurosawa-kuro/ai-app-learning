# AGENTS.md

## 現行範囲

- 上位の提供方針と[通常じゃんけん仕様](docs/specs/gas-basic.md)を正本とする。
- GASは通常対戦・勝敗・得点・履歴のみ。スキル・仲間収集・AIはGAS基本版に戻さない。Web版はスキル必須のまま。
- 現行ソースは`src/basic/`、出力は`dist-basic/`。旧`src/server`・`src/client`と01〜08文書は履歴確認用。旧クラウドのデータを新規通常版へ無断で変換・削除しない。

## 実装と検証

- 保存はstore.js、業務判断はapplication.js、GAS入口はweb.js、ブラウザ通信はbridge.htmlへ分ける。独自フレームワークを増やさない。
- 同じ要求ID・同じ手の再送は再抽選・二重加点しない。勝敗・得点をサーバーで決める。入力値はDOMのtextContentで表示する。
- 初期化は専用Sheetsへ1回。再実行で履歴を消さず、Webからは登録済みIDで開く。秘密をコード・文書・ログへ出さない。
- 変更後は`npm run check`。PlaywrightのPC・スマホのスクショを実際に見る。ローカル模擬GASと実GASの受入を分けて報告する。
- 配置先は`.clasp.json`のrootDir=`dist-basic`。`npm run build`後の9ファイルを確認してpushする。本人限定公開。初期化・公開版更新・実保存確認をpush成功だけで完了にしない。

進捗と残作業は[横断実行記録](../../docs/tasks/gas-release-20261028.md)。README・CLAUDEへ同じ時系列ログを複製しない。
