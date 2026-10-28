# ② 本名非開示・ナイトワーク向けの設計

状態：内部設計。2026-10-28。公開無効。共通要件は[分離ポリシー](../separation-policy.md)。

日記利用者には写真から下書きを作り手直しする体験、店舗運営者には架空実績と配点で月次集計を確かめる体験を案内する。日記利用者全員へ店舗の実評価データを見せる設計にはしない。

| 公開候補 | 役割 | 原稿 |
|---|---|---|
| `index.md` | 写メ日記・キャスト評価の二つの入口 | `publishing/alias-nightlife/content/index.md` |
| `photo-diary.md` | 写メ日記の下書き・手直し | 同フォルダーの `photo-diary.md` |
| `cast-evaluation.md` | 架空実績・配点・集計の紹介 | 同フォルダーの `cast-evaluation.md` |
| `photo-diary-basics.md` | 日記の基本説明を共用 | `publishing/common/content/photo-diary-basics.md` |
| `first-step.md` | 一課題を試す共通手順 | `publishing/common/content/first-step.md` |

上記原稿パスは `src/app-learning/` 基準。本名、①・③のプロフィール・アカウント・連絡先を使わず、別出口へリンクしない。③とは別の活動名を使用する。具体的な活動名・ブランドは未設定。

独自ドメインは必須ではなく簡易サービスでもよい。原稿・設定・検査はできるだけ共通にし、①のドメイン配下や本名の出るアカウント・URLは使わない。

招待制は推奨であって未採用のため、[設定](../../../publishing/alias-nightlife/publish.yaml)は `access_mode: undecided` とする。決定・実装前に公開可能とは扱わない。

機能・検証の正本は[写真日記](../../../02-web-app-learning/photo-diary/README.md)と[キャスト評価](../../../02-web-app-learning/cast-evaluation/README.md)。自動投稿、集客成果、POS・給与連携、GAS版完成を勝手に宣伝しない。デモURLは保護範囲を確認するまで公開原稿へ載せない。[運用手順](operations.md)で確認する。
