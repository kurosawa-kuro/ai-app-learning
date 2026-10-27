# Web版5教材の横展開記録

2026-10-27。提供者の制作順はWeb→GAS。受講順はGAS→Web。全教材の履修を成功条件にしない。

## コピーと分離

基準コミット `1e56304db211ec16d3dee971c093778ff81584b8` のtemplateから、5アプリそれぞれ412ファイルを丸ごとコピーし、固有変更前のSHA256一致を確認した。[全ファイル照合](tasks/copy-baseline-20261027.json)。秘密値・実データ・再生成物の除外理由も記録している。

| 教材 | 起動ポート | 開発スキーマ | 固有機能のブラウザー確認 | 実AI | Render公開 |
|---|---|---|---|---|---|
| [写真日記](../photo-diary/docs/lesson-implementation.md) | 8091 | photo_diary | 確認済み（3画像・手直し・保存・再読込・2ページ） | 3画像で確認済み | 準備中 |
| [キャスト評価](../cast-evaluation/docs/lesson-implementation.md) | 8092 | cast_evaluation | 確認済み（実績・同点順位・編集・再集計） | 不要 | 今回は公開しない |
| [英語](../english-trainer/docs/lesson-implementation.md) | 8093 | english_trainer | 固定応答で確認済み（クイズ・会話・振り返り・履歴） | 確認中 | 今回は公開しない |
| [ショップ](../online-shop/docs/lesson-implementation.md) | 8094 | online_shop | 確認済み（1800円の注文・再送・取消） | 不要 | 今回は公開しない |
| [じゃんけん](../skill-janken-game/docs/lesson-implementation.md) | 8095 | skill_janken_game | 固定応答で確認済み（採用・対戦・履歴） | 確認中 | 今回は公開しない |

最初の公開対象は写真日記のみ。他の4教材まで公開済みとは扱わない。

## 検証中に見つけて修正した点

- 写真日記の一覧HTML、画面別スクリプトの配信先、Fetch APIの応答判定。
- 3画像を受け付けるリクエスト全体の上限と、保存失敗時の入力保持。
- 追加モジュール・追加テーブルを認識する回帰テスト。既存の検証は削除していない。
- コピー後のWindows PowerShellスクリプトの文字コード。
- スマホのGrid最小幅と、キャスト評価表の横スクロール。
- ショップの通信失敗後も同じ要求IDで再送する処理。

## 動作環境の制限

同時起動とテストでSupabase Session poolerの接続枠15件に達した。確認済みアプリを停止し、1アプリずつ検証する。接続失敗をアプリの動作成功に数えない。

ローカルの確認、実Gemini確認、Render公開受入は分けて記録する。初回起動遅延は通常操作とは別に測る。
