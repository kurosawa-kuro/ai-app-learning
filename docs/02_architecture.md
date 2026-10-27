# 02 アーキテクチャ

アプリ学習の横断設計は[app-learning/docs](../src/app-learning/docs/README.md)を正本とする。受講順は01 GAS → 02 Web、提供者がコード・解説を作る順番は02 Web → 01 GAS。Web側で仕様と期待結果をローカル検証し、題材のルール・テスト観点・解説をGAS側へ展開する。

[ルート3文書](00_index.md#権威順位)の方針に基づき、独立した入口を同じリポジトリで管理する。共通のアプリ実行環境や、全員が順番に履修するシステムではない。

## 構成と責務

| 場所 | 責務 |
|---|---|
| [gas-app-learning](../src/app-learning/01-gas-app-learning/README.md) | 既存5教材、対象者別の学習設計、体験と改善の支援 |
| [web-app-starter](../src/app-learning/02-web-app-learning/web-app-support-strategy.md) | 非エンジニアが自分用・業務用アプリを使うための支援戦略 |
| [java-career-learning](../src/java-career-learning/java-career-learning-strategy.md) | Java・Oracleの資格と実習を仕事へつなぐ戦略 |
| [office-automation-starter](../src/office-automation-starter/README.md) | Windowsでの事務処理教材・プロンプト・サンプル |
| [docs](00_index.md) | 共通の要件・作業・検証・支援終了の具体化 |
| [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md) | 共通の作業方針 / Claude Code固有の案内 |

GASの5教材はそれぞれ独立している。ゲームのポイントと店舗の評価ポイント、英語の学習履歴と日記の記録など、同じ語が出ても業務上の意味は統合しない。共通化は必要性と既存実装を確認して判断する。

## Webアプリの採用構成

[ADR 0001](adr/0001-web-app-stack.md)により、WebアプリとGAS教材の発展版は次の構成を採用する。Next.js＋Vercel案は廃止済み。

```text
ブラウザー
  → Render上のSpring Boot / Spring MVC / Thymeleaf
  → Supabase PostgreSQL
  → 必要な場合のみSupabase Storage
```

これは採用方針であり、接続・公開済みの構成図ではない。認証、サービスプラン、環境変数、公開・復旧手順は対象アプリの実装時に確定・検証する。詳細は[Webアプリ支援戦略](../src/app-learning/02-web-app-learning/web-app-support-strategy.md)に従う。

Java・SQL、ひな形、AIへの指示、検証・復旧手順は提供者側で再利用する。利用者にすべての構成技術の習得を要求しない。既存GAS版は維持し、発展版は同じ題材の要件と受入条件で1題材ずつ整備する。

## 共通化しない境界

- Oracle資格に固有の管理・SQL実習はOracleで扱う。Web教材のPostgreSQLで代替済みとしない。
- Linux・AWSは志望する仕事に応じた追加学習。Web教材の標準公開先はRender。
- 業務効率化教材は追加のPython・Node.jsを前提にせず、元ファイルを保全するコピー操作と単独プロンプトを維持する。
- 設定・秘密情報・保存先は各教材の方式に従う。ルートのenvやDopplerを一律に導入しない。
- Codex向けの共通指示はAGENTS.mdへ置く。Claude専用のrules・skillsを全エージェントが読む前提にしない。

## 支援の流れを支えるもの

[初回支援の流れ](01_requirements.md#初回支援の中核の流れgolden-path)は、本人の課題と[支援シート](templates/ai-pairing-session.md)、検証した教材環境、AIとのやり取り、結果確認、引き渡しで成立する。教材の追加や技術の乗換えを、支援を終えるための条件として増やさない。
