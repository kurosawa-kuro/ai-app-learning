# プロジェクトドキュメント索引

> 2026-10-28 状態整理：現在は本人限定@20。DB v2移行、日付列追加・旧6件保持、実OpenAI画像下書き・保存・再表示・タグ管理を確認済み。キー再発行・再登録後の接続確認は残る。本文の2026-10-24／25の版番号・試験件数・未確認表記は当日の履歴。390px幅の確認を物理スマホの受入と同一視しない。 現在の確認済み事項と残作業は[5教材の受入記録](../../../docs/tasks/gas-release-20261028.md)を参照。

現行の基本範囲は[GAS基本機能とWebとの差](specs/gas-baseline.md)を優先する。実施状況は[5教材の実行記録](../../../docs/tasks/gas-release-20261028.md)。

このディレクトリは、プロジェクトの要件・設計・ワークフロー・テスト・リリース運用の正本。`AGENTS.md` は Codex / 他エージェント向けの repo ガイド、`CLAUDE.md` は Claude Code の司令塔、`docs/tasks/` は毎日の作業計画・実装タスク・調査ログの実行ハブ、`.claude/skills/` は Claude Code で繰り返し使う作業手順。

## 今回の整合基準と読み方

2026-10-24 の更新は、ユーザー指定の [README.md](../README.md)・[CLAUDE.md](../CLAUDE.md)・[AGENTS.md](../AGENTS.md) を基準に、01〜08 とプロジェクト固有の作業方針を具体化した。基準3文書は今回変更していないため、そこにある「01〜08 はテンプレート」という記述は更新前の状態を指す。

- プロジェクトの範囲・共通規約は基準3文書に合わせる。docs はその詳細を展開する。
- 実際の挙動・コマンド・列定義はソース・package.json・manifest で確かめる。文書と実装の差は不整合として明記し、推測で成功扱いしない。
- docs/tasks/ の設計案・ロードマップ・計測値・版番号は履歴と将来構想。現在の仕様や検証結果より優先しない。
- 汎用アーキテクチャと templates/ は参考・記入用。GAS にないツールや機能を稼働中と解釈しない。

2026-10-24：生成スクリプトと生成テストの参照先を env/ に修正し、npm test は全48件成功。40ファイルを push し、既存デプロイを @11 から @12 に更新した。公開URLは維持。接続可能なブラウザがなく、公開画面・スマホの操作は未確認。

## 毎日使う入口

| 入口 | 用途 |
|---|---|
| [tasks/README.md](tasks/README.md) | 今日やること、次にやること、完了したことを管理する |
| [tasks/03_active/refactoring-candidates.md](tasks/03_active/refactoring-candidates.md) | 常時見る cleanup / refactoring 候補 |
| [04_workflows.md](04_workflows.md) | 作業開始、検証、リリース前確認のコマンド |
| [07_test_strategy.md](07_test_strategy.md) | タスク完了前に通す品質ゲート |

`docs/tasks/` は仕様の正本ではないが、日々の実行順・証跡・未決事項の正本として扱う。確定した仕様は `docs/specs/` や 01〜08 文書へ、判断理由は `docs/decisions/decision-log.md` に記録し、恒久的な設計判断は該当仕様に反映する。独立した ADR が必要なら `docs/adr/` を作る（現在は未作成）。

## ドキュメント一覧

現在の主要業務の依存関係は [Domain / Application設計](specs/application-domain-architecture.md) を参照。DBの正本は引き続きDB v2仕様。

| ドキュメント | 役割 |
|---|---|
| [01_requirements.md](01_requirements.md) | 目的・範囲・ユーザー・ユースケース・Critical User Journey / Golden Path |
| [02_architecture.md](02_architecture.md) | 構成要素・境界・実行モデル |
| [03_domain_model.md](03_domain_model.md) | 用語・状態・ビジネス概念 |
| [04_workflows.md](04_workflows.md) | ローカルコマンドと運用フロー |
| [05_data_model.md](05_data_model.md) | データ・スキーマ・設定・永続化 |
| [06_error_policy.md](06_error_policy.md) | エラー処理・リトライ・ログ |
| [07_test_strategy.md](07_test_strategy.md) | テスト方針と品質ゲート |
| [08_release_runbook.md](08_release_runbook.md) | リリース・マイグレーション・復旧 |
| [tasks/README.md](tasks/README.md) | 日次運用の実行ハブ、作業計画、実装タスク |

## ハーネス（AI 制御）

AI エージェント制御の全体像は [.claude/README.md](../.claude/README.md)。アーキ本体とその repo 固有 instantiation は `docs/specs/` に置く。

| ドキュメント | 役割 |
|---|---|
| [specs/kurosawa-thin-harness-architecture.md](specs/kurosawa-thin-harness-architecture.md) | Thin Harness アーキ本体（tool-agnostic マスター） |
| [specs/runtime-protocol.md](specs/runtime-protocol.md) | 実行手順と停止条件（repo 固有） |
| [specs/capability-boundary.md](specs/capability-boundary.md) | 保護 capability と permissions 写像（脅威モデル） |
| [specs/change-boundary.md](specs/change-boundary.md) | 保護パスと変更境界 |
| [specs/evidence-policy.md](specs/evidence-policy.md) | Evidence Level と done の下限 |
| [specs/judgment-memory.md](specs/judgment-memory.md) | 判断記憶のパイプライン |
| [templates/](templates) | 各 Layer のテンプレ（contract / weight-class / reality-check 等） |
| [decisions/decision-log.md](decisions/decision-log.md) | 判断日誌（trade journal、append-only） |
| [memory/](memory) | 蒸留済み判断記憶 |

## 履歴と将来構想

- [MVP 設計案・変更記録](tasks/01_idea/GAS日記アプリ_MVP基本設計_画像1対多とタグ多対多.md)
- [展開ロードマップ](tasks/01_idea/cold/GAS生成AIアプリ_展開ロードマップ_日記からAI英語日記と業務転用.md)
- [責務分割](tasks/02_backlog/リファクタリング方針.md)・[UI](tasks/02_backlog/リファクタリング方針-UI.md)・[性能](tasks/02_backlog/GAS性能_調査と対応方針.md)の記録
