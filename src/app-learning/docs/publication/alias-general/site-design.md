# ③ 本名非開示・一般向けの設計

状態：内部設計。2026-10-28。公開無効。共通要件は[分離ポリシー](../separation-policy.md)。

本名サイトの完成を待たず、一般向けの教材案内を準備する出口。利用者には身近な一課題を試す入口として案内し、本名サイトの準備事情や将来の移転先を表示しない。

| 公開候補 | 役割 | 原稿 |
|---|---|---|
| `index.md` | 身近な記録から始める入口 | `publishing/alias-general/content/index.md` |
| `photo-diary.md` | 写真日記の紹介 | 同フォルダーの `photo-diary.md` |
| `photo-diary-basics.md` | 日記の基本説明を共用 | `publishing/common/content/photo-diary-basics.md` |
| `first-step.md` | 一課題を試す共通手順 | `publishing/common/content/first-step.md` |

上記原稿パスは `src/app-learning/` 基準。本名もナイトワークも出さない。①の本名・連絡先・プロフィールを流用せず、②の専門情報・URL・アカウントも流用しない。②とは別の活動名を使用する。具体的な活動名・ブランドは未設定。

独自ドメインは必須ではなく簡易サービスでもよい。原稿・設定・検査はできるだけ共通にし、①のドメイン配下や本名の出るアカウント・URLは使わない。

①と共用できる説明は `common/content/` に一度だけ置く。導入・名義・問い合わせは[専用設定](../../../publishing/alias-general/publish.yaml)と専用原稿で管理する。機能の正本は[写真日記](../../../02-web-app-learning/photo-diary/README.md)に残す。

将来①・②へ整理するときは、中立本文の再利用と本人の対応関係の公開を分ける。③→①の自動転送や名前の置換は行わない。[運用手順](operations.md)で終了・移行を扱う。
