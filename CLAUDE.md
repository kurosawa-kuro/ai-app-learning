# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業する際の最小ガイド。

## 目的と教育方針

IT入門者がAIを活用して、ITの基礎、プログラミング、業務効率化、資格取得に取り組むためのリポジトリ。**誰の、どんなゴールに、どんなスタート支援を提供し、AIで何を横展開するか**を取り組みごとに設計する。

まず [AGENTS.md](AGENTS.md) の対象者別の方針を読み、対象教材のガイドへ進む。作業のGoal / Doneには、対象者と本人のゴールを反映する。日本語で前提と確認方法を示し、AIの生成結果と本人の習得、構想と実装・検証済みの状態を区別する。

| 対象者・ゴール | 優先資料 | スタート支援とAIによる横展開 |
|---|---|---|
| 子供・英語学習者・写真日記の利用者・店長等、それぞれの興味や課題 | [GASアプリ集](src/gas-app-learning/README.md) | 題材の体験と小さな変更を支援し、AIで次の変更へ応用。子供の楽しさ・理解、学習への活用、店舗業務の運用を別々に評価する |
| 自分用・業務用のアプリを作って使いたい非エンジニア | [Webアプリ・公開戦略メモ](src/web-app-starter/GASではなくSpringBoot-render-supabase戦略.md) | 要望整理、ひな形、環境、最初の公開を支援。動いたアプリをAIと用途に合わせて変え、別の身近な業務へ応用。実利用と変更結果の確認を成果にする |
| Java・Oracle系の仕事を目指すIT未経験者 | [Java・Oracle Bronze × Devin 学習戦略](<src/java-career-learning/Java・Oracle Bronze × Devin 実務直結型学習戦略.md>) | 環境と最初のJava・SQL課題を支援。AIの例題・解説・レビューで別課題に応用し、同じアプリを育てる。自力修正・テスト・資格と実習成果を確認する |
| 日々の事務処理を減らしたい非エンジニア、特にIT人材・SES営業 | [Cursor業務効率化スターター](src/office-automation-starter/README.md) | 導入・サンプル・プロンプトで1業務を支援。入力・条件・出力をAIと調整し、別の集計・資料整理等へ応用。正確さ・時間・再現性を確認する |

全ルートを同じ学習段階や成功条件に揃えない。GASの6工程と対面90分案はGAS教材内の枠組みであり、全員の必修ではない。Java学習で求める自力のコード・SQL修正を、業務効率化やアプリ実利用の全員へ課さない。

WebアプリとGAS教材の発展版は、**Spring Boot＋Thymeleaf＋Render＋Supabase**に統一する。Next.js＋Vercel案は2026-10-27に廃止。[採用判断](docs/adr/0001-web-app-stack.md)と[Web支援戦略](src/web-app-starter/GASではなくSpringBoot-render-supabase戦略.md)を参照する。採用決定を実装・公開・受入済みと混同しない。サービス対応・料金・コマンドは未検証の会話メモから転記しない。

Web教材のDBはSupabaseのPostgreSQL、画像保存は必要時にStorageを使う。Oracle資格の固有実習と、志望する仕事に応じたLinux・AWS学習は独立して扱う。スタックの統一を、利用者の目的・学習順・成功条件の統一へ広げない。

Java戦略は追記を含め、Java Bronzeは優先取得、Oracle Bronzeは学習先行・必要時受験とする。Cursor教材はWindows・追加ランタイム不要・元ファイル保全・単独で使えるプロンプトを維持する。教材ごとの業務ルール・公開範囲を尊重し、5教材の一括移植や新規教材の量産を暗黙の作業範囲にしない。

## Source of Truth

- Project overview: `README.md`
- 取り組み別の支援・作業方針: `AGENTS.md` と上記の参照資料
- 教材の現行仕様・実行手順: 対象の README / AGENTS.md / CLAUDE.md と、そこから参照する正本・実装・検証記録
- Documentation index: `docs/00_index.md`
- Requirements: `docs/01_requirements.md`
- Architecture: `docs/02_architecture.md`
- Test strategy: `docs/07_test_strategy.md`
- Harness 全体像: `.claude/README.md`（このリポジトリの AI 制御一式）
- Harness アーキ本体: `docs/specs/kurosawa-thin-harness-architecture.md`（tool-agnostic マスター）＋ repo 固有 instantiation（`docs/specs/{runtime-protocol,capability-boundary,change-boundary,evidence-policy,judgment-memory}.md`）
- 判断日誌 / 蒸留記憶: `docs/decisions/decision-log.md` / `docs/memory/`
- Feature spec（実装前・1 機能ごと）: `SPEC.md`
- Task notes: `docs/tasks/`
- GAS / Retool: [プラットフォームの入口](docs/runbooks/platforms.md)。対象kindではgas-workflow / retool-workflowを利用する。

**spec の使い分け（混同しない）**: `SPEC.md` = 今から作る 1 機能の使い捨て実装スペック（公式 Explore→Plan→Implement→Commit の入口、新セッションで実行）。`docs/specs/` = 恒久アーキ設計マスター。`docs/tasks/` = タスク台帳。

ルート `docs/` にはテンプレートの未記入項目が残る。未記入を確定要件として補完せず、対象教材の正本と実装を確認する。戦略資料は学習の方向性を示すもので、アプリの完成や公開を証明しない。

## コマンド

ルートの `Makefile` は実処理が未設定のテンプレート。`make setup` / `make build` / `make run` / `make dev` / `make test` / `make fmt` / `make lint` を動作済みの共通コマンドとして扱わない。

- 対象教材の README と実際の `Makefile`・マニフェスト・スクリプトから、作業ディレクトリと検証方法を確認する。
- 文書のみの変更は、参照資料との整合性、相対リンク、差分を確認し、`git diff --check` を実行する。
- コード変更は対象教材のテスト・整形・静的検査を行う。実環境受入や公開の確認はローカル検証と分けて報告する。
- 未作成のSpring Boot・Java実習環境について、起動コマンドやテスト合格を推測で記載しない。

## アーキテクチャ

- `src/` に複数教材と戦略資料を置く。各教材の構成と導入条件を尊重する。
- 設定・秘密情報は対象教材の仕組みに従う。ルート共通設定の `env/config.yaml`、ローカル秘密情報の `env/secret.yaml`、Doppler (`doppler.yaml`) を全教材へ一律導入しない。秘密情報をコミットしない。
- 設計・運用ドキュメントは `docs/` 配下。権威順位と更新規約は `docs/00_index.md` に従う。
- パス別ルールは `.claude/rules/` 配下に置く。
- 一回性の作業計画は `docs/tasks/`、繰り返し使う作業手順は `.claude/skills/` に置く。

## 作業ルール

- 推測でコードを書かない。コマンドを書いたら実際に実行して確認する。
- 仕様変更は連動する `docs/` とテストを同一 PR で直す。drift を作らない。
- 既存の関数・ユーティリティ・パターンを優先的に再利用する。
- task note を仕様の正本にしない。確定内容は `docs/specs/`、`docs/adr/`、`docs/runbooks/` に昇格する。
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
