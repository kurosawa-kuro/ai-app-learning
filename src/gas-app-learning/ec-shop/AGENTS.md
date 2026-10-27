# AGENTS.md

AI コーディングエージェント（Claude Code / Codex / GitHub Copilot 等）共通の作業ガイド。
Codex は作業前にこのファイルを読むため、ここには repo 共通方針のみ記す。
ツール固有の指示は各ツールのファイル（例: Claude Code は `CLAUDE.md`）に置く。

## プロジェクト概要

- 名称・目的: ec-shop-gas。注文の RDB 設計を理解するための、小規模な学習用 EC アプリ。
- 主要技術: GAS と Google スプレッドシート。1 テーブルを 1 シートで再現する。
- ログイン不要。事前登録した架空のユーザーを選ぶ。単一店舗とし、ショップテーブルと `shop_id` は設けない。
- 現時点の要件・設計の正: [ec-shop-gas のアイディア](docs/tasks/01_idea/ec-shop-gasのアイディア.md)。作業前に読む。

## 初期設計の方針

- 6 テーブル: `users`、`products`、`categories`、`product_categories`、`orders`、`order_items`。
- ユーザーと注文、注文と注文明細は 1 対多。商品とカテゴリーは中間テーブルによる多対多。
- 6 ページ: 商品一覧・商品詳細・カート・注文確定・注文一覧・注文詳細。注文完了は注文確定ページ内で表示する。
- カートは画面上で保持する。専用テーブル・永続化は初期範囲に含めない。
- 注文明細に注文時の商品名・単価を保存し、過去の金額を現在価格で再計算しない。
- スプレッドシートに FK・一意制約・トランザクションがあると仮定しない。GAS 側の検証・排他・再送と途中失敗への対処を設計する。
- ユーザー選択を認証と扱わない。架空データを使用し、ユーザー変更時はカートと前の履歴表示を解除する。
- 決済・配送・在庫引当・会員登録・運営者権限・管理画面は初期範囲外。詳細仕様と未決定事項はアイディア文書を参照する。

## セットアップ / 主要コマンド

現状の Makefile は TODO メッセージのみの雛形。正常終了を実際のテスト・整形・起動成功と報告しない。

```bash
make setup    # 依存取得 + ビルド
make dev      # 開発サーバー
make test     # テスト
make fmt      # フォーマット
```

## コーディング規約

- 既存のコード・命名・パターンに合わせる。新規導入より既存の再利用を優先する。
- 変更後はテストとフォーマッタを実行してから完了とする。
- 非機密の設定値は `env/config.yaml`、ローカル秘密情報は `env/secret.yaml`、チーム共有・本番クレデンシャルは Doppler (`doppler.yaml`)。秘密情報をコミットしない。

## ドキュメント

設計・仕様・運用は `docs/` 配下を参照。一般の更新規約と権威順位は `docs/00_index.md` に従う。
ただし本プロジェクトの要件・設計は、ユーザー指定により上記アイディア文書を正とする。一般の「task note は正本にしない」という規約よりこの指定を優先する。正本を移す際は参照先と優先順位も更新する。
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
- 上記アイディア文書を除き、task note を仕様の正本にしない。具体化した仕様は `docs/05_data_model.md` や `docs/specs/`、判断理由は `docs/adr/`、運用手順は `docs/runbooks/` へ反映する。

## 探索と出力量

GAS / Retoolを使う場合は[プラットフォームの入口](docs/runbooks/platforms.md)と対象ディレクトリのAGENTS.mdを読む。対象kindではgas-workflow / retool-workflowをCodexとClaudeの両方へ配布する。生成・ローカル検査・公開・実機受入を区別する。

小さな修正は`rg`と必要範囲の読取りを使う。RTKが利用可能ならGit status・Cargo test・pytest・ruff checkを明示的に圧縮できる。正確なdiff・全件一覧・診断原文が必要なら通常コマンドを使う。Serenaは既定無効で、参照調査が必要なセッションだけ有効化する。導入・実利用確認・復元・効果測定は[運用手順](docs/runbooks/ai-coding.md)を参照する。
