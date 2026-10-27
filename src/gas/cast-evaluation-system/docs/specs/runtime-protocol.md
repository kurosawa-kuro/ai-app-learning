# Runtime Protocol（このプロジェクトの instantiation）

**§18 AI Runtime Protocol** と **§11.4 AI-facing Stop Rules** の repo 固有 instantiation。マスター文書 [`kurosawa-thin-harness-architecture.md`](./kurosawa-thin-harness-architecture.md) が tool-agnostic に定義し、このファイルが stop rules を*このリポジトリ*の境界へ固定する。薄い常時版は `CLAUDE.md`、これはより詳しい参照。

## プロダクト固有の前提

[基本仕様・設計 v0.3.0（Draft）](<../tasks/01_idea/Cast Evaluation System — 基本仕様・設計.md>) を正本として扱う。Small Core / Integration Firstに従い、既存SaaSの領域へ機能を広げず、正本§15の判断基準で追加の必要性を検討する。

MVPはGAS・Sheets・HTML Serviceの4機能・3画面・3シート。実装済み、接続済み、公開済み、実機受入済み、運用検証済みを区別する。Makefileは雛形であり、その成功終了を動作の証拠にしない。

## 最小ループ（毎タスク）

1. Goal / Scope / Done を言い直す。
2. Weight Class を判定 — Light / Standard / Heavy（`classify-task`）。
3. owner-only 判断を確認（`scan-decisions`）。
4. 保護 capability を確認（`capability-boundary.md`）。
5. allowed / forbidden paths を確認（`change-boundary.md`）。
6. Standard/Heavy は skeleton + TDD contract を先に（`plan-skeleton`）。
7. scope 内で最小十分な変更を当てる。
8. 必要な Evidence Level で検証（`evidence-policy.md`）。
9. scope 拡大・保護境界接触・二度違う理由で検証失敗 → 停止（`reconcile-task`）。
10. 非自明な判断を下した時だけ記録（`log-decision`）。

## 停止して owner に確認する（このリポジトリ）

これらは `.claude/settings.json` の `ask`/`deny` と保護境界に対応する:

- `env/secret/**`、`infra/**`、`**/terraform/**`、`.github/workflows/**` を編集する（`detect-safety-boundary` hook が強制）
- 本番デプロイ / secret push / 生インフラ・DBツールの副作用操作（settings.json の `ask`）
- DB schema 変更 / migration
- 運用中のmembers / daily_records / evaluation_rulesへの依頼範囲外の書き込み・削除。特にルール変更は管理者による過去期間への影響確認を要する
- 課金が発生する操作 / 外部通知の送信
- ドメインモデル名・ビジネスルールの意味を変える（`docs/03_domain_model.md`）
- 受け入れ意図を捨てて実装に合わせるためだけに test を変更する
- weight-class の max を超えてファイルに触れる、または二度違う理由で検証失敗する
- user-visible な影響を持つ不明な要件を仮定する必要がある
- 現 scope 外の既存バグを見つけた（`control-change` 経由）
- 認証情報 / secret / 本番データ / owner-only アクセスが必要

## 自律で進めてよい時

scope 内 · allowed paths · 保護 capability なし · 低リスク · ローカル · 可逆 · テスト可能 · 既存方針と整合 · safety-boundary もドメイン意味の変更もない。

> このテンプレは**安全既定**で、生インフラ/DBツールを `ask` に置く。このプロジェクトの脅威モデルで loss-critical 資産が無い（DB/インフラが再構築可能）なら、`.claude/README.md` と `capability-boundary.md` の方針に従って raw ツールを `allow` に緩めてよい。
