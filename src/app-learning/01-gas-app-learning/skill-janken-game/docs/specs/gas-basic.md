# GAS通常じゃんけんの仕様

2026-10-28。GASは通常じゃんけん、WebでスキルとAIセリフを追加する。GAS側にスキル必須の旧版を配らない。

## 提供する体験

1. グー・チョキ・パーから手を選び、1回対戦する。
2. CPUの手、勝敗、得点を見る。勝ち2点、あいこ・負け1点。
3. 累計と履歴を見る。再読込後もSheetsから復元する。

プレイヤーはP001の1人。CPUは3手から等確率で選ぶ。最大200対戦で停止し、自動削除しない。スキル、仲間収集、抽選、AI、課金、認証機能の独自実装は範囲外。Googleの公開範囲は本人限定。

## データと処理

| Sheets | 列 | 学ぶ関係 |
|---|---|---|
| players | id, name | プレイヤー |
| rounds | id, player_id, player_hand, cpu_hand, result, points, created_at | プレイヤー1：対戦記録多 |

`initializeApp`が専用の新規Sheetsへ2表を作成し、Script Propertiesへ保存先を登録する。再実行で既存履歴を消さない。Webは登録先をopenByIdで開き、activeなシートに依存しない。

`rpc("play", {requestId, hand})`はロック内で入力を確認し、CPUと結果を決めて1行追記する。同じ要求ID・同じ手の再送は保存済み結果を返し、再抽選・二重加点しない。同IDで異なる手は拒否。得点はサーバー側で計算し、画面から渡された得点は使用しない。

`rpc("overview")`はプレイヤー・累計点・新しい順の履歴を返す。画面は保存成功後に結果を表示する。通信失敗時は選択と要求IDを保持する。

## 配布対象

- 現行ソース：`src/basic/`の9ファイル。
- `npm run build`で構文・manifestを確認し、`dist-basic/`へ出力する。
- `.clasp.json`のrootDirは`dist-basic`。旧`src/server`・`src/client`・`dist`は配布しない。
- 旧スキル版は履歴確認用に残す。既存のクラウド・Sheetsは削除・変換せず、通常版は別の専用プロジェクトへ配置する。旧対戦のスキル加点を通常版の累計へ混ぜない。
- 旧スキル仕様の01〜08文書は参考資料。本書をGASの現行仕様とする。Web版のスキル仕様は変更しない。

## 検証と配置

```powershell
npm ci
npm run check
node node_modules/@google/clasp/build/src/index.js push --force
```

checkはビルド・業務テスト・整形・Playwright。PC1440px／スマホ390pxで対戦→再読込、横はみ出し、画面を確認する。プレビューは模擬GASで実Sheetsへ接続しない。

実環境では対象Sheetsに紐付くエディタで`initializeApp`を実行・認可し、MYSELF / USER_DEPLOYINGでデプロイする。公開URLで1対戦→再読込→Sheetsの1行を照合する。同じ要求の再送で行数が増えないことも確認する。公開受入の状態は[横断実行記録](../../../../docs/tasks/gas-release-20261028.md)を参照。

実GASのブラウザー確認には[通常ChromeでのPlaywright接続手順](../../../../docs/runbooks/gas-playwright-chrome.md)を使用する。Googleの初回承認後、検証担当が対戦・再読込・スクリーンショット確認を進める。

## 小さな横展開

AIへの依頼例：「勝ちの得点を3点へ変えてください。勝ち・あいこ・負けの期待値と、変更後に保存される得点を確かめる方法も説明してください」。一度にスキル・対人戦・AI対戦へ広げず、本人が1変更を試して確認する。
