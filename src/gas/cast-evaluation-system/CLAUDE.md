# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業する際の最小ガイド。

## Source of Truth

- プロダクト仕様の正本: [Cast Evaluation System — プロダクト方針・基本仕様・設計書 v0.3.0（Draft）](<docs/tasks/01_idea/Cast Evaluation System — 基本仕様・設計.md>)。他の文書・雛形と矛盾する場合はこの仕様を優先する。
- 共通の作業ルール・MVPの実装境界: `AGENTS.md`
- Project overview: `README.md`
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

**spec の使い分け（混同しない）**: `SPEC.md` = 今から作る 1 機能の使い捨て実装スペック（公式 Explore→Plan→Implement→Commit の入口、新セッションで実行）。`docs/specs/` = 恒久アーキ設計マスター。`docs/tasks/` = 原則タスク台帳。ただし上記の基本仕様・設計はユーザー指定のプロダクト仕様の正本であり、配置先を理由に優先順位を下げない。

## プロジェクトとMVP

**Small Core / Integration First**。既存店舗システムと共存する独立型評価システムとして、Member → Performance → Evaluation Rule → Evaluation Result の4領域に集中する。スマートフォンで日次入力と評価確認が完結するUIを優先する。

- F01 メンバーの一覧・登録・編集・状態管理。IDを自動発行し、状態は `ACTIVE` / `INACTIVE`。退店時は削除せず無効化し、過去実績を保持する。本名など不要な個人情報は管理しない。
- F02 ドリンク杯数・ボトル本数・指名件数・同伴件数・個人売上（整数円）の登録・編集。すべて0以上の整数、1キャスト・1営業日につき1レコードとし、過去実績も編集できる。
- F03 評価項目の計算単位・配点・有効／無効をGoogle Sheetsで直接管理。数量4項目は初期有効、個人売上ポイントは初期無効（売上自体は記録・表示）。配点例は設計確認用の仮設定であり、業界標準ではない。
- F04 対象月を選択し、キャスト別に5項目・総合ポイント・順位を表示。ポイント順／個人売上順の表示に対応する。

UIはメンバー管理・営業実績入力・評価一覧の3画面。ルール専用画面や評価結果の保存テーブルを作らない。個人売上の正本は既存会計・POS等とし、確定済み金額を評価用に手入力する。会計・売上確定、商品明細、自動計算、売上按分、自動照合はMVPに含めない。

### 計算と順位の必須ルール

- **対象期間の数量・金額をキャスト別に集計した後**に計算する。
- 数量4項目: `ポイント = 期間数量 × ポイント単価 / 計算単位`。
- 個人売上: `売上ポイント = floor(期間売上 / 計算単位) × ポイント`。日次の切り捨て結果を合算しない。
- 総合ポイントは有効項目の合計。ランキングは総合ポイント降順 → 同点なら個人売上降順 → 両方同じなら同順位。
- ルール変更時は過去期間も再計算する。運用開始後のルール変更には管理者の確認が必要。履歴管理は過去結果の固定が必要になった段階で検討する。
- 数量ポイントの端数表示、同順位の次の順位番号、営業日の区切りなど未定義の詳細は判断事項として明示する。定義済みの売上切り捨てや同点判定を未定義扱いしない。

### 開発判断・将来拡張

POS・注文・決済、商品・在庫、勤怠・シフト、顧客・予約、給与計算、会計・税務・経理は原則として本体に実装せず、既存SaaSの利用・連携を優先する。汎用ルールエンジンやワークフローエンジンも構築しない。

指名種別、共同売上按分、CSV、POS API連携、ルール履歴、評価ランク、キャスト用画面、ネイティブアプリ、複数店舗は正本§14の条件を満たした場合の検討候補。詳細KPI分析・高度なグラフ・複雑な評価アルゴリズム・時給査定／給与反映はMVP対象外。

新機能は正本§15の5基準（評価への直接的必要性、既存システムでの代替可否、実店舗の課題確認、評価モデルを変えず実装可能か、未実装でも業務が成立するか）を確認する。未実装でも業務が成立するものは原則後回し。Phase 1で評価業務を検証し、Phase 2は実店舗で確認した課題のみ改善、Phase 3で横展開・API／DB・モバイル技術を判断する。需要確認前のSaaS化を先行しない。

二重入力の負担、設定で吸収できないルール、POS相当の機能要求、過大な連携・保守コスト、需要不足は正本§18に従って方針を再検討する。

## コマンド

現状の `Makefile` の `setup` / `build` / `run` / `dev` / `test` / `fmt` / `lint` はメッセージを出力する雛形。実際のセットアップ・ビルド・テスト・整形・静的解析は未実装。成功終了を検証済みと扱わない。GASの接続・公開手順も未整備であり、実装時に実在する手順・コマンドを確認する。

## アーキテクチャ

- 初期構成はGAS + Google Sheets + HTML Service、通信は `google.script.run`、バージョン管理はGit / clasp。ソース配置先は `src/`（現状アプリケーション未実装）。採用方針と実環境の設定完了を区別する。
- `members` / `daily_records` / `evaluation_rules` の3シートのみ使用し、型・カラムは正本§10に従う。`business_date` + `member_id` を一意に保ち、行番号を業務IDにしない。評価結果は3シートから都度算出する。
- `evaluation_rules.category` は `DRINK` / `BOTTLE` / `NOMINATION` / `ACCOMPANIMENT` / `SALES` の固定値。
- UI・業務ロジック・Sheetsデータアクセスを分離する。ポイント計算をSheets関数や画面処理へ埋め込まず、独立したロジックとして保持する。過度な抽象化や大量のService・Repositoryクラスは導入しない。
- GASは初期開発・検証用とし、業務モデルをGAS固有機能に依存させない。将来API・DBへ移行できる余地を残す。MVPでネイティブアプリは作らず、将来ネイティブ化する場合は独立API基盤への移行を検討する。PWA / React Native + Expo / Flutterの最終選定は実運用を踏まえて行う。
- 管理者限定アクセス、サーバー側入力検証、レコードID、排他制御、重複防止、GASの実行制限を考慮した一括読み書きを必須とする。GAS Webアプリの公開・実行権限は運用するGoogleアカウント環境に合わせる。
- 評価ルールは `evaluation_rules` シートで管理する。開発環境用の `env/config.yaml` / `doppler.yaml` との用途を混同しない。GASとの設定・秘密情報の連携方法は未定義。ローカル秘密情報（`env/secret.yaml` 等）はコミットしない。
- 設計・運用ドキュメントは `docs/` 配下。プロダクト仕様は上記正本を優先し、それ以外の文書運用は `docs/00_index.md` を参照する。
- パス別ルールは `.claude/rules/` 配下に置く。
- 一回性の作業計画は `docs/tasks/`、繰り返し使う作業手順は `.claude/skills/` に置く。

## 作業ルール

- 推測でコードを書かない。コマンドを書いたら実際に実行して確認する。
- 仕様変更は連動する `docs/` とテストを同一 PR で直す。drift を作らない。
- 既存の関数・ユーティリティ・パターンを優先的に再利用する。
- 通常の task note を仕様の正本にしない。ただし、上記の基本仕様・設計はユーザー指定の正本として扱う。将来正本を移す場合は参照先と優先順位も揃える。その他の確定内容は `docs/specs/`、`docs/adr/`、`docs/runbooks/` に昇格する。
- MVP受入は正本§16に従い、キャスト登録・編集・在籍状態管理、日次実績登録・編集、重複防止、ポイント設定・計算、月次一覧・ランキングを確認する。スマートフォン操作、既存POS・会計を変更しない運用、管理者の理解、入力負担も受入対象。
- KPIは全キャスト分の日次入力5分以内、営業日の登録継続率90%以上、評価計算のテストケース100%一致、既存業務の変更は原則不要という仮目標。実店舗で検証・調整する。
- 検証では期間集計後の売上切り捨て、数量計算、有効／無効、同点順位、ルール変更後の過去再計算、0以上の整数、重複防止、退店後の実績保持を確認する。ローカル検証・GAS実機受入・実店舗での運用検証を区別し、未確認事項を明示する。
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
