# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業する際の最小ガイド。

## プロジェクト概要

ec-shop-gas は注文の RDB 設計を学ぶ小規模な GAS アプリ。保存先は Google スプレッドシートで、ログインなしに事前登録した架空のユーザーを選ぶ。単一店舗として扱う。

- 6 テーブル: `users`、`products`、`categories`、`product_categories`、`orders`、`order_items`。ショップテーブル・`shop_id` は不要。
- ユーザーと注文、注文と注文明細は 1 対多。商品とカテゴリーは多対多。
- 6 ページ: 商品一覧・商品詳細・カート・注文確定・注文一覧・注文詳細。注文完了は注文確定ページ内で表示する。
- カートは画面上で保持し、再読み込みで失われる。カート用テーブルは追加しない。
- 注文時の商品名・単価を明細へ保存し、キャンセル後も注文・明細を残す。
- シートを RDB と同等には扱わず、GAS 側で整合性検証・排他・再送と途中失敗への対処を設計する。
- 決済・配送・在庫引当・会員登録・運営者権限・管理画面は初期範囲外。詳細は下記の正本を参照する。

## Source of Truth

- 現時点の要件・設計の正: [ec-shop-gas のアイディア](docs/tasks/01_idea/ec-shop-gasのアイディア.md)
- 共通作業ガイド: `AGENTS.md`
- Project overview: `README.md`
- Documentation index: `docs/00_index.md`
- Requirements: `docs/01_requirements.md`
- Architecture: `docs/02_architecture.md`
- Data model（具体化した設計の反映先）: `docs/05_data_model.md`
- Test strategy: `docs/07_test_strategy.md`
- Harness 全体像: `.claude/README.md`（このリポジトリの AI 制御一式）
- Harness アーキ本体: `docs/specs/kurosawa-thin-harness-architecture.md`（tool-agnostic マスター）＋ repo 固有 instantiation（`docs/specs/{runtime-protocol,capability-boundary,change-boundary,evidence-policy,judgment-memory}.md`）
- 判断日誌 / 蒸留記憶: `docs/decisions/decision-log.md` / `docs/memory/`
- Feature spec（実装前・1 機能ごと）: `SPEC.md`
- Task notes: `docs/tasks/`
- GAS / Retool: [プラットフォームの入口](docs/runbooks/platforms.md)。対象kindではgas-workflow / retool-workflowを利用する。

**spec の使い分け（混同しない）**: `SPEC.md` = 今から作る 1 機能の使い捨て実装スペック（公式 Explore→Plan→Implement→Commit の入口、新セッションで実行）。`docs/specs/` = 恒久アーキ設計マスター。`docs/tasks/` = タスク台帳。

## コマンド

現状の Makefile は TODO メッセージのみの雛形。正常終了を実際の起動・テスト・整形の成功と扱わない。

```bash
make setup    # 初期セットアップ (依存取得 + ビルド)
make build    # ビルド
make run      # 実行
make dev      # 開発サーバー / ホットリロード
make test     # テスト
make fmt      # フォーマット
make lint     # 静的解析
```

## アーキテクチャ

- ソースは `src/` 配下に置く。
- 非機密の設定は `env/config.yaml`、ローカル秘密情報は `env/secret.yaml`、チーム共有・本番クレデンシャルは Doppler (`doppler.yaml`) で管理する。
- 設計・運用ドキュメントは `docs/` 配下。一般の権威順位と更新規約は `docs/00_index.md` に従う。ただし本プロジェクトの要件・設計はユーザー指定のアイディア文書を優先し、`docs/tasks/` を正本にしない一般規約の例外とする。正本を移す際は参照先と優先順位も更新する。
- パス別ルールは `.claude/rules/` 配下に置く。
- 一回性の作業計画は `docs/tasks/`、繰り返し使う作業手順は `.claude/skills/` に置く。

## 作業ルール

- 推測でコードを書かない。コマンドを書いたら実際に実行して確認する。
- 仕様変更は連動する `docs/` とテストを同一 PR で直す。drift を作らない。
- 既存の関数・ユーティリティ・パターンを優先的に再利用する。
- 上記アイディア文書を除き、task note を仕様の正本にしない。具体化した仕様は `docs/05_data_model.md` や `docs/specs/`、判断は `docs/adr/`、運用は `docs/runbooks/` へ反映する。
- **Scope invariant（常時）**: 作業中に Goal/Scope 外の変更・前提崩れ・追加副作用・docs と実装の矛盾を見つけたら即実装しない。`control-change` で分類するか follow-up task に残す。「ついで修正/共通化/改名」は scope creep。

## AI Runtime Protocol（薄い・常時）

Thin Harness の常時手順。詳細は `.claude/README.md` と `docs/specs/runtime-protocol.md`、停止条件は同 §「停止して owner に確認する」。

> **このハーネスは重い既定で出荷されている。** 新規生成直後は、まず skill `harness-trim` を1回回し、このプロジェクトの脅威モデルに合わせて hooks / rules / permissions / agents / skills を keep・delete・adjust する（削除は想定手順で scope creep ではない）。以降は下記の常時手順に従う。

1. Goal / Scope / Done を言い直す。
2. Weight Class を判定（Light / Standard / Heavy → `classify-task`）。Light は以降の重い手順をスキップしてよい。
3. owner-only 判断・保護 capability・allowed/forbidden paths を確認（`scan-decisions` / `capability-boundary.md` / `change-boundary.md`）。
4. Standard/Heavy の新機能は **plan モードで探索（編集せず読む）→ `SPEC.md` を自己完結で記述（触るファイル/IF 名指し・Non-scope・末尾 E2E 検証）→ 可能なら新セッションで実行**。その後 skeleton + TDD contract を先に固める（`plan-skeleton`）。
5. scope 内で最小変更を当てる。複数 attempt が要るなら停止条件付きで回す（`reconcile-task`）。
6. 必要 Evidence Level（≥2、本番は4）で検証（`verify-completion` / `evidence-policy.md`）。
7. scope 拡大・保護境界接触・二度違う理由で検証失敗 → 停止して owner へ。
8. 非自明な判断を下した時だけ記録（`log-decision`）。
