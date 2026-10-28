# 教材を動かすための作業

[最小構成](educational-baseline.md)に合わせ、独自バックアップ・復元・監視画面は廃止した。

- 起動：`./run-local.sh` または `.\run-local.ps1`。
- ポート停止：`./run-local.sh -Action stop -Port 8080`。
- シード確認：`./run-local.sh -Action seed-preview`。
- サンプル追加：`./run-local.sh -Action seed`。利用者データは残す。
- 未登録のサンプル画像追加：`./run-local.sh -Action seed-images`。
- 削除に失敗した画像の後片付け：`./run-local.sh -Action seed-cleanup`。
- Java検証：`./run-local.sh -Action test`。独立テストスキーマを使う。
- 画面検証：`npx playwright test`。画像あり／なしで別テストスキーマを使う。

`seed-reset` は全投稿を置換するため、通常の追加には使わない。シードは開発スキーマだけで実行し、通常起動ではデータを変更しない。

AIは管理画面で許可とモデルを指定し、明示操作で送る。下書きはブラウザーの直近1件だけ保持する。必要な結果は投稿本文へ反映して保存する。通信失敗時の自動再送はない。

秘密値は `.env`。順番はアプリ・DB・画像・OpenAI・Render。認証設定は不要。公開時は[Render手順](render-deployment.md)を使う。
