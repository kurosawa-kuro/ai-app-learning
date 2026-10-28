# ショップ・じゃんけんの公開受入（2026-10-28）

## 結果

全5教材の公開受入が完了。今回アプリ実装は変更せず、リモートmasterの `8e2bcd004d54960661f2c9ab25020b33b4592a46` を公開した。先行3教材の公開版は `16f71d8` のまま。

| 教材 | URL | サービスID | デプロイID | DBスキーマ |
|---|---|---|---|---|
| ショップ | https://learning-online-shop.onrender.com/shop | srv-dbgjp9qfngtc73frij20 | dep-dbgjpaqfngtc73frimp0 | online_shop_render |
| じゃんけん | https://learning-skill-janken-game.onrender.com/janken | srv-dbgjpb0m7kps739hcnvg | dep-dbgjpc0m7kps739hcr80 | skill_janken_game_render |

Render APIで両デプロイの `live` を確認。無料プラン・Singapore・自動デプロイoff。DB接続は既存方式、各最大2・最小待機0。じゃんけんは実Gemini（live）、ショップにGeminiキーは設定していない。秘密値は記録・コミットしない。

## 枠の確保

ユーザーが削除候補について「どれでもよい」と承認。直前に名前とsuspended状態を確認し、次の2件だけ削除した。

- starter-kit：srv-d5a36ldactks73f3i100（starter-kit_OLDリポジトリの停止済みWebサービス）
- nextjs-ssg-json：srv-d2g24iodl3ps73ep3ir0（停止済み静的サイト）

教材の既存サービス・GitHubリポジトリは削除していない。有料化していない。

## 操作確認

- ショップ `tests/shop-acceptance.cjs`：架空の注文者「教材 みお」、商品500円×2＋800円×1＝1,800円、数量保持でカートへ戻る、確定・再読込、同じ要求再送で同じ注文、注文全体取消、スマホ表示。成功。
- じゃんけん `tests/janken-acceptance.cjs`：「教材 そら」で実AI下書き→本人の手直し→採用保存→対戦。対戦中のdraft通信0、得点・セリフ・履歴を再読込後も確認。成功。
- `template/tests/lesson-user-selection.cjs`：じゃんけんで「教材 さくら」を追加し、画面のプレイヤー選択と左下ユーザー表示、切替・再読込を確認。成功。
- `template/tests/rollout-ui-audit.cjs`：両教材のPC 1440×1000／スマホ390×844、CSS HTTP／MIME、JavaScript例外、横はみ出し、管理メニュー、手動DB接続確認。成功。
- スクショを実際に開き、商品入力、注文詳細、対戦・セリフ・履歴、管理画面の配置を確認。今回の確認範囲で追加修正を要する崩れは見つからなかった。

初回は両教材ともデプロイ完了前にテストを開始し、ユーザー入力欄の待機で失敗した。成功に数えていない。ログでDBマイグレーションと起動を確認し、live後の受入を実施した。既存のJava全体試験は今回再実行していない（アプリソース変更なし）。

## 表示時間

架空の商品・注文・対戦履歴を入れた稼働中の画面。コールドスタート、AI生成、画像取得完了の測定ではない。

| 教材 | 画面ロード3回（秒） | TTFB3回（秒） |
|---|---|---|
| ショップ | 1.788 / 0.921 / 0.690 | 1.172 / 0.897 / 0.669 |
| じゃんけん | 1.965 / 0.911 / 1.037 | 1.526 / 0.886 / 1.003 |

## 証拠の保存先

以下はローカル生成物（Git対象外）。受入結果の要点と対象版は本書へ残す。

- `online-shop/test-results/shop-mobile.png`
- `skill-janken-game/test-results/janken-mobile.png`
- `template/test-results/ui-audit/online-shop-public/`：PC／スマホ・各セクション・DB・メニュー
- `template/test-results/ui-audit/skill-janken-game-public/`：同上
- `template/.local/remaining-deploys.json`：サービス・デプロイ識別子
- `template/.local/remaining-public-metrics.json`：表示時間

## 次の扱い

今回の公開・公開受入の残件はなし。協力者の試用・支援終了・GAS対応は別工程。[次工程の作戦書](../../横展開はダミーデータで先に画面と機能を作ってしまう作戦の後の作戦をどうするか？.md)で準備／協力者待ちを分ける。認証・監査・独自復旧などを追加していない。
