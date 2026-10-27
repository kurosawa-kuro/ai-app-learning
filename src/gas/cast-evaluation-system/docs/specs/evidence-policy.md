# Evidence Policy（このプロジェクトの instantiation）

**Layer 8: Evidence / Reality Check**（§16）の repo 固有 instantiation。汎用 Evidence Level を*このリポジトリ*の確実な成果へ写像する。Skill: `verify-completion`（+ `check-claims`）。reminder hook: `detect-unverified-claim`。

プロダクトの受入は [基本仕様・設計 v0.3.0（Draft）](<../tasks/01_idea/Cast Evaluation System — 基本仕様・設計.md>) §16と [テスト戦略](../07_test_strategy.md) に従う。Levelは証拠の種類であり、未実施の検証を省略する根拠にしない。

## 中核ルール

> エージェントの「完了しました」は証拠ではない。証拠とは diff / test 出力 / コマンドログ / 実ファイル / 実行時の挙動 / 永続化された成果である。
> **done は Evidence Level ≥2 が下限（docs-only タスクを除く）。本番影響のある変更は Level 4 + owner approval。**

## Evidence Level（汎用・そのまま）

| Level | 名前 | これで証明される |
|---:|---|---|
| 0 | Claim Only | 「動くはず」 — 受理しない |
| 1 | Static | diff、実ファイル内容、`cargo check` / 型チェック / lint — docs-only や trivial 編集 |
| 2 | Test | 実テストの入力・期待値・結果、修正前fail→修正後pass。現状のmake testは雛形であり該当しない |
| 3 | Runtime | ローカル実行＋永続化された成果（下表のいずれか） |
| 4 | Production | 本番ログ / 監視チェック / ロールバック準備（`docs/08_release_runbook.md`）— owner approval 必須 |

## 本プロダクトで確認する成果

| 作業種別 | 確認する結果 |
|---|---|
| 評価計算 | 期間集計後のfloor、有効／無効、数量計算、同点順位、過去期間再計算の期待値と一致 |
| Sheets登録・編集 | 保存後の再読込で値とIDが一致し、同時登録でも重複しない |
| メンバー状態変更 | INACTIVE化後もメンバーと過去実績が保持される |
| GAS・画面 | 管理者で3画面を操作し、非管理者のアクセスが拒否される |
| スマートフォン | 登録・編集・月次評価の主要操作がタッチ操作で完結する |
| 公開 | 対象版・権限・公開先を記録し、中核フローを実環境で確認する |
| 運用 | 入力時間・登録継続率・管理者の理解・既存業務の変更有無を実測する |
| 文書 | 正本との整合性、リンク、未決事項と設計案の区別、仕様書を意図せず改変していないこと |

ローカル計算テストでGAS接続・権限・公開・実店舗での有効性は証明できない。仮KPIを実測値として扱わない。

## ルール

- すべての PASS に `file:line` かコマンド出力を引用する。未証明は UNVERIFIED であり PASS にしない。
- 確実な成果チェックの無い「緑のワークフロー」は最大でも Level 1 で、done ではない。
- 本番検証は runbook（`docs/08_release_runbook.md`）であって、ビルド成功ではない。
