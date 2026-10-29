# プロジェクトドキュメント索引

このディレクトリは、[README.md](../README.md)・[AGENTS.md](../AGENTS.md)・[CLAUDE.md](../CLAUDE.md)を正として、複数の教材・学習支援に共通する要件、設計、作業、検証、運用を具体化する。単一の完成アプリの仕様書ではない。

アプリ学習に関する横断設計は、昇格した[src/app-learning/docs](../src/app-learning/docs/README.md)を正本とする。受講順は01 GAS → 02 Web、提供者のコード・解説の制作順は02 Web → 01 GAS。Webで動作確認を先に行いやすいことを理由とし、受講者の順番とは分けて管理する。

本名公開・題材を分ける3出口の確定要件と運用は[publication](../src/app-learning/docs/publication/README.md)、外向き原稿と許可設定は[publishing](../src/app-learning/publishing/README.md)を正本とする。ルート・アプリ学習の全体READMEは内部総覧であり、利用者向けの公開原稿とは分ける。

## 権威順位

AIの役割分担とGemini廃止は[ADR 0003](adr/0003-ai-service-roles.md)で管理する。コードの質問・改造はDevin、コードからのAI呼び出しはOpenAI API、業務自動化はCursor。2026-10-28の[関連文書更新記録](tasks/05_done/2026-10-28-ai-service-roles.md)を参照。

| 判断する内容 | 基準にする資料 |
|---|---|
| 対象者・目的・初回成功・支援の終了・全体構成 | ルートの[README.md](../README.md) |
| 教材整備・AIエージェント共通の作業方針 | ルートの[AGENTS.md](../AGENTS.md) |
| Claude Code固有の作業案内 | ルートの[CLAUDE.md](../CLAUDE.md) |
| 全体方針の具体化・採用理由・共通運用 | 本ディレクトリの01〜08、ADR、runbook。上記3文書に整合させる |
| 個別教材の業務ルール・導入・検証方法 | 対象教材のREADME・AGENTS.mdと、そこから指定された正本 |
| アプリ学習01・02の横断設計、受講順と制作順 | [src/app-learning/docs](../src/app-learning/docs/README.md) |
| 現在動くこと・公開状況の事実 | 対象のコード・設定・実行結果・日付と版を伴う検証記録 |
| 作業途中の案・経緯 | `docs/tasks/`・archive。確定方針や現在の検証結果の代わりにしない |

根拠は内容ごとに判断する。実装と方針の不一致は差分として扱い、コードがあるだけで採用済み・学習者が習得済みとはしない。雛形のTODOや一般例を確定要件として補わない。

## 4つの独立した入口

初回は、本人に意味のある1課題でAIへの依頼・試行・結果確認を経験できれば成功。支援付きでよく、全教材・全技術・資格・自立・横展開を一括条件にしない。提供者は合意した課題と回数・時間・期間で支援し、再利用できる材料を渡して終了する。

| 入口 | 優先して読む資料 |
|---|---|
| 身近な題材でITに触れる | [GASアプリ集](../src/app-learning/01-gas-app-learning/README.md) |
| 自分用・業務用アプリを作って使う | [Webアプリ制作の案内](../src/app-learning/02-web-app-learning/README.md) |
| Java・Oracleの資格と実習を仕事につなげる | [Javaキャリア学習戦略](../src/java-career-learning/java-career-learning-strategy.md) |
| 日々の事務処理の手間を減らす | [業務効率化スターター](../src/office-automation-starter/README.md) |

この順序は履修順ではない。本人の目的に合う入口を一つ選ぶ。

## 命名規則

例外：`src/解説/記事/` の文書は、ユーザー指定により日本語の `対象読者_内容.md` とする。受講者向けと作成者向けを区別し、[解説記事の命名規則](../src/解説/記事/README.md#ファイルの命名規則)に従う。

- プロジェクトのフォルダー名は英小文字・数字・ハイフンの `kebab-case` とし、対象と用途が分かる名詞で表す。
- アプリ名は `photo-diary`、`english-trainer`、`skill-janken-game` のように機能を表す。AIの利用やGAS等の実装技術はREADMEで説明し、アプリ名の接頭辞・接尾辞へ一律に付けない。
- `game`・`shop`・`diary`・`trainer` はアプリの種類を表すため使う。意味を増やさない `system`・`app` の付加は避ける。上位フォルダーの `learning`・`starter` は学習分野・導入支援の役割を表す。
- 戦略資料は「対象・目的＋`strategy.md`」とし、採用サービスの列挙、過去案との比較、空白や記号をファイル名に含めない。日本語の説明は文書タイトル・本文へ置く。`README.md`・`AGENTS.md`等の慣例名や既存の連番仕様書は維持する。
- 改名時はリンク、操作手順、ローカル設定、npmのパッケージ名も揃える。ブラウザーの保存キー・クラウドのリソース名・公開URL・IDは別の識別子として管理し、フォルダー改名に連動させない。

2026-10-27の対応表。過去の記録や既存リソースには旧名が残る。

| 旧名 | 現在の名前 |
|---|---|
| `skill-janken` | `skill-janken-game` |
| `ec-shop` | `online-shop` |
| `cast-evaluation-system` | `cast-evaluation` |
| `ai-photo-diary` | `photo-diary` |
| `ai-english-trainer` | `english-trainer` |
| `GASではなくSpringBoot-render-supabase戦略.md` | Web版READMEへ統合 |
| `Java・Oracle Bronze × Devin 実務直結型学習戦略.md` | `java-career-learning-strategy.md` |

## 毎日使う入口

教育支援の最初の実証は[初回支援シート](templates/ai-pairing-session.md)と[1人・1課題の検証案](../src/app-learning/docs/06_first-pairing-pilot.md)を使う。本人の初回成功と、提供者が合意した範囲で支援を終了できたことを分けて記録する。

| 入口 | 用途 |
|---|---|
| [tasks/README.md](tasks/README.md) | 今日やること、次にやること、完了したことを管理する |
| [tasks/03_active/refactoring-candidates.md](tasks/03_active/refactoring-candidates.md) | 常時見る cleanup / refactoring 候補 |
| [04_workflows.md](04_workflows.md) | 作業開始、検証、リリース前確認のコマンド |
| [07_test_strategy.md](07_test_strategy.md) | タスク完了前に通す品質ゲート |
| [runbooks/ai-coding.md](runbooks/ai-coding.md) | Codex探索Skill、RTKの明示利用、必要時のSerenaと効果測定 |
| [runbooks/platforms.md](runbooks/platforms.md) | GAS・Retoolの選択と併用の境界 |
| [templates/platform-acceptance.md](templates/platform-acceptance.md) | 公開と実機受入の証跡 |
| [templates/ai-coding-measurement.md](templates/ai-coding-measurement.md) | 実作業比較をtaskへ記録する書式 |

`docs/tasks/` は仕様の正本ではないが、日々の実行順・証跡・未決事項の正本として扱う。確定した仕様は `docs/specs/` や 01〜08 文書へ、判断理由は `docs/adr/` へ昇格する。

## ドキュメント一覧

Webアプリの採用基盤は[ADR 0001](adr/0001-web-app-stack.md)を参照する。Spring Boot＋Thymeleaf＋Render＋Supabaseへの統一は決定済みで、実装・公開・受入状況とは分けて管理する。

Webテンプレートの機能境界と依存方向は[ADR 0002](adr/0002-web-template-modules.md)と[構造・改修例](../src/app-learning/02-web-app-learning/template/docs/architecture.md)を参照する。対象はWebテンプレートであり、全教材への一律適用や学習者の必修条件にはしない。

| ドキュメント | 役割 |
|---|---|
| [01_requirements.md](01_requirements.md) | 対象者・目的・初回成功・支援範囲 |
| [02_architecture.md](02_architecture.md) | 独立した教材構成・Web採用基盤・責務の境界 |
| [03_domain_model.md](03_domain_model.md) | 支援・成果・横展開の用語と状態 |
| [04_workflows.md](04_workflows.md) | 教材整備と初回支援の進め方 |
| [05_data_model.md](05_data_model.md) | 支援記録・教材別の保存先・設定の扱い |
| [06_error_policy.md](06_error_policy.md) | 学習上のつまずき・提供物の不具合・技術障害の切り分け |
| [07_test_strategy.md](07_test_strategy.md) | 教材品質・学習成果・支援終了の別々の確認 |
| [08_release_runbook.md](08_release_runbook.md) | 教材提供・個別アプリ公開・引き渡しと支援終了 |
| [tasks/README.md](tasks/README.md) | 日次運用の実行ハブ、作業計画、実装タスク |

## ハーネス（AI 制御）

AI エージェント制御の全体像は[.claude/README.md](../.claude/README.md)。アーキ本体とそのrepo固有の適用方針は `docs/specs/` に置く。これは教材を整備する提供者・開発者向けの資料で、学習者の必修科目ではない。汎用テンプレートのツール例を、このリポジトリへの導入済み宣言として扱わない。

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
