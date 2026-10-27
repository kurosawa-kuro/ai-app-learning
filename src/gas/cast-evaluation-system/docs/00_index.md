# Cast Evaluation System — ドキュメント索引

## プロダクト仕様の正本

[プロダクト方針・基本仕様・設計書 v0.3.0（Draft）](<tasks/01_idea/Cast Evaluation System — 基本仕様・設計.md>) をプロダクト仕様の正本とする。ユーザー指定の正本であり、`tasks/01_idea/` という配置先を理由に未整理メモや移動対象として扱わない。

方針は **Small Core / Integration First**。責任範囲はMember・Performance・Evaluation Rule・Evaluation Result。GAS + Google Sheets + HTML Serviceでスマートフォン中心の最小MVPを検証する。

## 文書の役割・優先順位

| 種別 | 役割 |
|---|---|
| 基本仕様・設計 | プロダクトの方針・仕様を定義する正本 |
| 01〜08文書 | 正本に従い要件・設計・データ・運用・検証を整理した派生文書 |
| README / AGENTS / CLAUDE | 概要とエージェント向けの入口 |
| 通常のtask・memory・判断記録 | 作業計画・証跡・判断背景。正本を上書きしない |
| コード・Makefile・環境設定 | 現在の実装状態を確認する証拠。期待するプロダクト仕様の代替ではない |
| specs / templates / AI運用手順 | 開発作業の制御・書式。機能追加の根拠にはしない |

矛盾があれば基本仕様・設計を優先する。現在は正本がDraft、アプリケーションと実テストは未実装、Makefileは雛形。設計記述と実装済み・受入済みの状態を区別する。

正本で未定義の挙動は「未決事項」、実装を具体化する案は「設計案」として示す。決定していないルールを、派生文書だけで確定仕様にしない。

## 正本と派生文書の対応

| 正本の節 | 反映先 |
|---|---|
| §1〜4、§14〜19：方針・範囲・開発判断・受入 | [01 要件](01_requirements.md)、[07 テスト戦略](07_test_strategy.md) |
| §5〜8：メンバー・実績・ルール・評価一覧 | [03 ドメインモデル](03_domain_model.md)、[05 データモデル](05_data_model.md)、[07 テスト戦略](07_test_strategy.md) |
| §9：業務フロー | [04 ワークフロー](04_workflows.md) |
| §10：3シート・型・制約 | [05 データモデル](05_data_model.md) |
| §11〜13：構成・品質・モバイル・画面 | [02 アーキテクチャ](02_architecture.md)、[06 エラー方針](06_error_policy.md)、[08 リリース](08_release_runbook.md) |

## 未決事項

下記は正本の不足を補うための決定事項であり、新たなMVP機能ではない。実装・公開に必要な時点で決定し、正本と関連文書へ反映する。

| ID | 決定が必要な詳細 | 関連文書 |
|---|---|---|
| O01 | 営業日の区切り、タイムゾーン、日付の物理表現 | 03 / 05 / 07 |
| O02 | 数量ポイントの精度・端数表示、同順位の次の番号、売上順表示時の順位欄、実績ゼロの掲載 | 03 / 07 |
| O03 | unit・pointsの許容範囲、category欠損／重複、空欄・不正IDの扱い | 05 / 06 / 07 |
| O04 | ID生成、INACTIVEへの新規入力・再在籍、実績編集で日付・キャストを変更する扱い | 03 / 05 |
| O05 | 管理者識別、認証・認可、Sheets共有、GAS公開・実行権限 | 02 / 08 |
| O06 | ロック方式・競合応答、通信失敗時の再試行、ログ方針 | 02 / 06 |
| O07 | テスト基盤・実コマンド、GAS接続・公開・退避・復旧の具体手順 | 04 / 07 / 08 |
| O08 | 検証端末・規模・観測期間、登録継続率の分母／分子の定義 | 07 / 08 |

売上ポイントのfloor計算、期間集計後の計算、同点時の個人売上比較は既に定義済み。上記の未決事項と混同しない。

## 更新ルール

- 正本を基準に、変更した機能に関係する派生文書・検証例・ルートのガイドを同じ作業で同期する。
- 将来候補を確定スコープにしない。機能追加は正本§15の基準を使う。
- 正本の場所を変える場合は別途意図を確認し、参照を揃える。通常のタスク完了に伴って移動しない。
- 履歴・判断・実施記録は、実際に決定／実施した場合のみ追記する。検証予定を合格記録に変えない。
- AIハーネスのマスター・汎用テンプレートは汎用資料として扱い、サンプル技術や例示を本プロダクトの採用技術と解釈しない。

## 毎日使う入口

| 入口 | 用途 |
|---|---|
| [tasks/README.md](./tasks/README.md) | 今日やること、次にやること、完了したことを管理する |
| [tasks/03_active/refactoring-candidates.md](./tasks/03_active/refactoring-candidates.md) | 常時見る cleanup / refactoring 候補 |
| [04_workflows.md](./04_workflows.md) | 作業開始、検証、リリース前確認のコマンド |
| [07_test_strategy.md](./07_test_strategy.md) | タスク完了前に通す品質ゲート |
| [runbooks/ai-coding.md](./runbooks/ai-coding.md) | Codex探索Skill、RTKの明示利用、必要時のSerenaと効果測定 |
| [runbooks/platforms.md](./runbooks/platforms.md) | GAS中心の初期構成・連携の境界 |
| [templates/platform-acceptance.md](./templates/platform-acceptance.md) | 公開と実機受入の証跡 |
| [templates/ai-coding-measurement.md](./templates/ai-coding-measurement.md) | 実作業比較をtaskへ記録する書式 |

通常の `docs/tasks/` は実行順・証跡・未決事項を管理する。上記の基本仕様・設計だけはプロダクト仕様の正本として扱い、確定した変更を01〜08文書へ反映する。

## ドキュメント一覧

| ドキュメント | 役割 |
|---|---|
| [01_requirements.md](./01_requirements.md) | 目的・範囲・ユーザー・ユースケース・Critical User Journey / Golden Path |
| [02_architecture.md](./02_architecture.md) | 構成要素・境界・実行モデル |
| [03_domain_model.md](./03_domain_model.md) | 用語・状態・ビジネス概念 |
| [04_workflows.md](./04_workflows.md) | ローカルコマンドと運用フロー |
| [05_data_model.md](./05_data_model.md) | データ・スキーマ・設定・永続化 |
| [06_error_policy.md](./06_error_policy.md) | エラー処理・リトライ・ログ |
| [07_test_strategy.md](./07_test_strategy.md) | テスト方針と品質ゲート |
| [08_release_runbook.md](./08_release_runbook.md) | リリース・マイグレーション・復旧 |
| [tasks/README.md](./tasks/README.md) | 日次運用の実行ハブ、作業計画、実装タスク |

## ハーネス（AI 制御）

AI エージェント制御の全体像は `.claude/README.md`。アーキ本体とその repo 固有 instantiation は `docs/specs/` に置く。

| ドキュメント | 役割 |
|---|---|
| [specs/kurosawa-thin-harness-architecture.md](./specs/kurosawa-thin-harness-architecture.md) | Thin Harness アーキ本体（tool-agnostic マスター） |
| [specs/runtime-protocol.md](./specs/runtime-protocol.md) | 実行手順と停止条件（repo 固有） |
| [specs/capability-boundary.md](./specs/capability-boundary.md) | 保護 capability と permissions 写像（脅威モデル） |
| [specs/change-boundary.md](./specs/change-boundary.md) | 保護パスと変更境界 |
| [specs/evidence-policy.md](./specs/evidence-policy.md) | Evidence Level と done の下限 |
| [specs/judgment-memory.md](./specs/judgment-memory.md) | 判断記憶のパイプライン |
| [templates/](./templates/) | 各 Layer のテンプレ（contract / weight-class / reality-check 等） |
| [decisions/decision-log.md](./decisions/decision-log.md) | 判断日誌（trade journal、append-only） |
| [memory/](./memory/) | 蒸留済み判断記憶 |
