# AGENTS.md

AI コーディングエージェント（Claude Code / Codex / GitHub Copilot 等）共通の作業ガイド。
Codex は作業前にこのファイルを読むため、ここには repo 共通方針のみ記す。
ツール固有の指示は各ツールのファイル（例: Claude Code は `CLAUDE.md`）に置く。

## 現行の実装境界（2026-10-28）

- 教育用のCreate／Readを先行する：メンバー登録・一覧、日別実績の登録・一覧、配点の確認、月次集計・同点順位。
- 正本は[基本仕様](<docs/tasks/01_idea/Cast Evaluation System — 基本仕様・設計.md>)の先頭「先行するCreate／Read版」。旧構想より最新の縮小指示を優先する。
- 名前・在籍状態の編集、実績編集、配点変更UIは今回対象外。全部入りの業務システムに広げない。
- Sheetsの列定義・業務規則は[データ設計](docs/05_data_model.md)。UI・業務処理・保存を分離し、過度なクラス階層を作らない。
- サーバーで入力と参照を検証し、ScriptLock内で保存する。再送で二重登録せず、初期化で既存データを上書きしない。
- UIは入力保持・成功／失敗・空状態を表示する。文字列はtextContentで描画する。
- 独自認証・監査DB・復旧UI・AI台帳は追加しない。架空データ、GAS標準の本人限定公開を使う。
- コード・ローカル検証・実GAS受入・公開済みを区別する。現時点はローカル検証まで。

## セットアップ / 主要コマンド

`npm ci`、`npm test`、`npm run test:browser`、`npm run format`、`npm run format:check`。ローカル起動は`npm run dev`。実体はpackage.jsonと[公開手順](docs/08_release_runbook.md)を参照。Makefileの雛形を成功根拠にしない。

3表はmembers/daily_records/evaluation_rules。月合計後に数量配点、売上は月合計から切り捨て。ポイント→売上で同順位1・1・3。配点はSheetsで変更、画面は確認のみ。

## コーディング規約

- 既存のコード・命名・パターンに合わせる。新規導入より既存の再利用を優先する。
- 変更に対応する実際の検証を行い、実行内容と結果を記録する。テスト・フォーマッタが未整備ならその制約を明示し、雛形コマンドを検証の代用にしない。
- 評価ルールは `evaluation_rules` シートで管理する。開発環境用の `env/config.yaml` / `doppler.yaml` を業務ルールの保存先と混同しない。CR版の保存先はinitializeAppでScript Propertiesへ設定する。APIキーは不要。`.clasp.json`・認証ファイルはコミットしない。

## ドキュメント

設計・仕様・運用は `docs/` 配下を参照。プロダクト仕様は上記の基本仕様・設計を優先し、それ以外の文書運用は `docs/00_index.md` を参照する。
仕様レベルの変更は連動するドキュメントを同一 PR でまとめて直す。

## Codex / Claude Code

- `AGENTS.md` は Codex / 他エージェント共通ガイド。
- `CLAUDE.md` は Claude Code の司令塔。
- `.claude/rules/` と `.claude/skills/` は Claude Code 用。Codex が読む前提にしない。
- Codex 向けに永続させたい recurring な指摘やミス防止は、この `AGENTS.md` または nested `AGENTS.md` に小さく追加する。

## Harness（AI 制御一式）

- このリポジトリの AI 制御の全体像は `.claude/README.md`（Kurosawa Thin Harness Architecture の実装）。
- アーキ本体（tool-agnostic マスター）は `docs/specs/kurosawa-thin-harness-architecture.md`、repo 固有の脅威モデルは `docs/specs/{capability-boundary,change-boundary,runtime-protocol,evidence-policy,judgment-memory}.md`。
- permissions の ask/deny と保護パスは脅威モデルで決める。**他プロジェクトの設定をそのまま移植しない**。

## Task / Skill

- 一回性の作業計画・調査メモ・実装タスクは `docs/tasks/` に置く。
- Claude Code で繰り返し使う作業手順は `.claude/skills/` に置く（classify-task → create-task → scan-decisions → plan-skeleton → execute-task → verify-completion → review-task のライフサイクル）。
- Codex向けの探索手順は `.agents/skills/code-navigation/SKILL.md`。広い参照調査で必要になった時に読む。
- 通常の task note を仕様の正本にしない。ただし、上記の基本仕様・設計はユーザー指定の正本として扱う。将来正本を移す場合は参照先と優先順位も揃える。その他の確定した仕様は `docs/specs/`、判断理由は `docs/adr/`、運用手順は `docs/runbooks/` に昇格する。

## 探索と出力量

GAS / Retoolを使う場合は[プラットフォームの入口](docs/runbooks/platforms.md)と対象ディレクトリのAGENTS.mdを読む。対象kindではgas-workflow / retool-workflowをCodexとClaudeの両方へ配布する。生成・ローカル検査・公開・実機受入を区別する。

小さな修正は`rg`と必要範囲の読取りを使う。RTKが利用可能ならGit status・Cargo test・pytest・ruff checkを明示的に圧縮できる。正確なdiff・全件一覧・診断原文が必要なら通常コマンドを使う。Serenaは既定無効で、参照調査が必要なセッションだけ有効化する。導入・実利用確認・復元・効果測定は[運用手順](docs/runbooks/ai-coding.md)を参照する。
