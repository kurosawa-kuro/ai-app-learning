# ① 本名公開・一般向けの設計

状態：内部設計。2026-10-28。公開準備は保留。共通要件は[分離ポリシー](../separation-policy.md)。

本人の目的は、日常の記録や学習で一つの課題を試すこと。最初は写真日記の紹介と、AIへ依頼・試行・確認する手順を案内する。全教材の履修は求めない。

| 公開候補 | 役割 | 原稿 |
|---|---|---|
| `index.md` | 自分の課題から選ぶ入口 | `publishing/realname-general/content/index.md` |
| `photo-diary.md` | 日常記録の紹介 | 同フォルダーの `photo-diary.md` |
| `photo-diary-basics.md` | 日記の基本説明を共用 | `publishing/common/content/photo-diary-basics.md` |
| `first-step.md` | 一課題を試す共通手順 | `publishing/common/content/first-step.md` |

上記原稿パスは `src/app-learning/` 基準。リンクは公開候補内だけで完結させる。ナイトワーク・キャスト評価・別名義・他出口の存在を記載しない。

英語・ゲーム・ショップは今後の掲載候補だが、今回の素材台帳へ自動追加しない。機能の正本は[写真日記Web版](../../../02-web-app-learning/photo-diary/README.md)等に残し、ここへ複製しない。

①は独自ドメインを必須とする。教材の公開設定上の本名・ブランド・連絡先・ドメイン実値は未設定で、営業側の既存契約・準備状況と区別する。本名サイト作成に時間をかけるため、②・③の作業にこの出口の完成を依存させない。設定は[専用設定](../../../publishing/realname-general/publish.yaml)、公開確認は[運用](operations.md)で管理する。
