# CLAUDE.md

Claude Code向けの入口。最初に[AGENTS.md](AGENTS.md)を読み、共通規約・再発防止・検証手順に従う。ここでは仕様や履歴を重複管理しない。

## 必要な文書へ進む

| 作業 | 参照先 |
|---|---|
| 機能・導入・現状・検証実績 | [README](README.md) |
| データ変更・復旧 | [DB v2仕様](docs/specs/database-v2.md)・[Runbook](docs/08_release_runbook.md) |
| 責務分割・業務処理 | [Domain / Application設計](docs/specs/application-domain-architecture.md) |
| 写真・AI・運用診断 | [連携仕様](docs/specs/photo-gemini-integration.md)・[運用入口](docs/specs/setup-operations.md) |
| 残作業・過去の判断 | [タスク索引](docs/tasks/README.md)・[文書索引](docs/00_index.md) |

現行コードはDB v2とDomain / Application構成。旧文書の「業務4表」「キャッシュだけで再送防止」「表を消して再初期化」「DDD化しない」は実装判断に使わない。旧版の公開実績と最新@20の受入を区別し、[受入記録](../../docs/tasks/gas-release-20261028.md)で確認済み・残項目を判断する。

## Claude Codeでの作業

1. 依頼の目的・範囲・完了条件とGit差分を確認する。コマンドは`src/package.json`、既存機能はコードから確かめる。
2. [.claude/README](.claude/README.md)から、対象に応じたrules・skillsと[実行手順](docs/specs/runtime-protocol.md)を参照する。共通ルールをClaude専用ファイルだけへ追加しない。
3. 範囲内の最小変更と回帰検証を行い、確定仕様・運用手順を合わせて更新する。範囲外の変更や追加副作用は混ぜず、変更境界に従って扱う。
4. [AGENTSの検証手順](AGENTS.md#検証と反映)に従い、ローカル検証・実環境検証・push/deployの実施範囲を分けて報告する。
