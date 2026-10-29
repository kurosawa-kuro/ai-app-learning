# Web版の公開・検証状況

更新日：2026-10-29（日本時間）。記載した日付・版の確認結果であり、現在の外部サービスを再検証した記録ではない。実装範囲と始め方は[Web README](../README.md)、認証は[Googleログインの設定と確認](Googleログインの設定と確認.md)を参照する。

## 公開版と接続先

| 教材 | 公開先 | 確認済み公開版 | ローカルポート | 開発スキーマ |
|---|---|---|---|---|
| 写真日記 | [日記](https://learning-photo-diary.onrender.com/diary) | `dad117c`（10/29） | 8091 | `photo_diary` |
| キャスト評価 | [評価](https://learning-cast-evaluation.onrender.com/evaluation) | `dad117c`（10/29） | 8092 | `cast_evaluation` |
| 英語訓練 | [英語](https://learning-english-trainer.onrender.com/learning) | `dad117c`（10/29） | 8093 | `english_trainer` |
| ショップ | [ショップ](https://learning-online-shop.onrender.com/shop) | `cdefa83`（10/28） | 8094 | `online_shop` |
| じゃんけん | [じゃんけん](https://learning-skill-janken-game.onrender.com/janken) | `dad117c`（10/29） | 8095 | `skill_janken_game` |

公開用DBは各開発スキーマ名に`_render`を付けた専用スキーマ。写真日記の公開Storageは`photo-diary-images-render`。templateの公開版は`cdefa83`。公開6サービスのDBはV14、認証コード・V15は未公開。

`dad117ccec9f3dc67e01656614d4750cc0dea4db`は`cdefa83`を基準にUIUX差分だけを反映した`release/uiux-20261029`の版。masterには未公開の認証変更がある。templateはmasterの自動デプロイが有効なため、masterのpushを単なる記録同期として扱わない。対象4教材は自動デプロイ無効のまま、特定コミットを手動公開した。

## UIUX改善と受入

2026-10-29の上位7項目：じゃんけんの対象者・得点・履歴の一致、写真日記のAI置換確認、英語の送信中保護と回答・評価の対応、じゃんけんのセリフ手直し保護、英語・評価・じゃんけんの区画切替。共通差分はtemplateと5教材のソースへ反映し、固有変更のある4教材だけ公開した。

| 教材 | RenderデプロイID | 公開先で確認した操作 |
|---|---|---|
| 写真日記 | `dep-dbh4f0mc6qcc73ci6hr0` | 実OpenAI下書き、置換取消・承認、3画像保存・デコード、403後の入力保持と再送 |
| キャスト評価 | `dep-dbh4hdvf3r2c73esnon0` | 架空メンバー・実績作成、編集・再集計、区画切替と未保存入力保持 |
| 英語訓練 | `dep-dbh4gbafngtc73fcd2hg` | 実OpenAI採点・会話・振り返りと3履歴、待機中保護・旧評価解除・別区画の入力保持 |
| じゃんけん | `dep-dbh4dit9fdbs73a7q72g` | 実OpenAIセリフ生成・手直し採用、対戦・得点・履歴、対象者切替と破棄取消 |

公開用4教材のJava試験は318件中314件成功・実API用4件スキップ。追加UIUX受入と既存受入も成功。AI遅延・失敗は固定応答で再現し、実AIは公開先で別に確認した。PC1440×1000／ブラウザー390×844、JavaScript例外・不要な横はみ出しなし、CSS／JSのHTTP200・MIME・公開ソースとの一致を確認。評価表は内部で横スクロールする。物理スマホ・全基準の網羅・学習効果の実証ではない。

ショップは10/28に1,800円注文、数量保持で確認から戻る操作、同一要求再送、注文全体取消・再表示を公開先で受入済み。日記のタグ・画像、評価表、利用者表示、スマホヘッダー等の先行UI改善も反映済み。10/29の公開対象には含めていない。

## AI・DBの移行結果

10/28にOpenAI移行`1168e83`と画像枠修正`cdefa83`を全6サービスへ反映。全472件中466件成功・実API用6件スキップ、ローカル実API疎通は別途成功。公開先でtemplateの疎通、写真日記・英語・じゃんけんの実OpenAI操作、6サービスのPC／狭幅・CSS・画像表示を確認した。ショップ・評価へAIキーやAI機能は追加していない。設定は[Web README](../README.md)と各アプリの環境変数例を参照する。

V14は許可モデルをGPT形式へ移行し、投稿・画像・タグ・履歴・ユーザー・AI許可スイッチを保持。適用後にGeminiを使う旧コードだけを戻さない。先行するDB再設計は10/28に`734bd17`で全5教材へ反映し、旧43表の値・件数を照合一致。Java396件中391件成功・実API用5件スキップ、公開先の主要操作・PC／狭幅を確認済み。DBの現行構造は各教材の`docs/database-design.md`を正本とする。

## コピー元と検証方法

10/27、基準コミット`1e56304db211ec16d3dee971c093778ff81584b8`のtemplateから5教材へ各412ファイルをコピーし、固有編集前のSHA256一致を確認した。除外は`.env`（秘密値）、`.local`（実データ・ローカル記録）、`node_modules`・`target`・`playwright-report`・`test-results`（再取得・再生成可能）。新規作成・改修は[AGENTS.md](../AGENTS.md)に従う。

- UIUX：`template/tests/uiux-priorities.cjs`に`APP_KIND`と`APP_URL`を指定。実AI操作は`template/tests/uiux-live-acceptance.cjs`、通常の操作は各教材の受入スクリプトを使う。架空データを保存する試験なので対象環境を確認する。
- OpenAI疎通：各アプリの`tests/render-acceptance.cjs`。`RENDER_ACCEPTANCE_URL`と`RUN_RENDER_OPENAI=true`で実APIを明示的に呼ぶ。AI許可スイッチは元へ戻す。
- この環境ではDB接続枠15件への到達で試験・同時デプロイが失敗した。DB試験と公開更新は1アプリずつ行う。UIUX試験時は`MAVEN_ARGS=-Dspring.test.context.cache.maxSize=1`、接続プールは既定3件を維持して成功した。
- ログ・画像は各教材の`test-results/`・`.local/`、UIUXは公開用作業フォルダーの`template/test-results/uiux-priorities/`・`uiux-live/`。生成物・秘密値をGitへ入れない。

完了した作業計画・調査・詳細ログはGit履歴（整理前の`c920480`）で参照できる。現状の判断は本書、仕様は各教材、認証の残件は[設定と確認](Googleログインの設定と確認.md)に集約する。本人との初回試用・支援終了は[初回のAI並走](../../docs/06_first-pairing-pilot.md)で別に確認する。
