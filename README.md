# your-project

プロジェクト名に置き換える。簡易説明をここに書く（何を解決するか・主要機能）。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| 言語 | TODO |
| フレームワーク | TODO |
| データベース | TODO |
| インフラ | TODO |

## セットアップ

```bash
make setup    # 依存取得 + ビルド
make dev      # 開発サーバー起動
make test     # テスト
```

設定は `env/config.yaml`（非機密）、`env/secret.yaml`（ローカル秘密情報）、Doppler（チーム共有・本番秘密情報）で管理する。
`env/secret.yaml` は `.gitignore` で除外されるためコミットしない。

Codexの探索SkillとSerenaの任意設定は生成済み。小規模修正は標準検索、RTKは明示呼出し、Serenaは既定無効から必要時だけ使う。[AIコーディング環境](docs/runbooks/ai-coding.md)で端末の準備と実利用確認を行う。生成器はツール本体をインストールしない。

## ディレクトリ構成

```
.
├── env/
│   ├── config.yaml   # プロジェクト固有設定（非機密）
│   └── secret.yaml   # ローカル秘密情報（コミット禁止）
├── src/              # アプリケーションコード
├── docs/             # source-of-truth ドキュメント
├── .agents/skills/code-navigation/  # Codexの探索Skill
├── .codex/config.toml              # Serena MCP、既定無効
├── .serena/                        # 読取り中心の設定、cache等はignore
└── .claude/rules/    # Claude Code パス別作業ルール
```

## ドキュメント

開発・運用の詳細は [`docs/00_index.md`](docs/00_index.md) を参照。

- [`docs/01_requirements.md`](docs/01_requirements.md) — 目的、スコープ、ユースケース
- [`docs/02_architecture.md`](docs/02_architecture.md) — 構成、境界、設計判断
- [`docs/04_workflows.md`](docs/04_workflows.md) — セットアップ、検証、運用フロー
- [`docs/07_test_strategy.md`](docs/07_test_strategy.md) — テスト方針
