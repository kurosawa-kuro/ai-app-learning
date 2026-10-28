# AIの役割分担・Gemini廃止の文書更新

- 日付：2026-10-28
- 根拠：ユーザー指定。コードについての質問はDevin、コードからの質問はOpenAI（Gemini廃止）、業務自動化の質問はCursor。
- 正本：[ADR 0003](../../adr/0003-ai-service-roles.md)

## 対象と完了条件

全体方針、各学習ルートの入口、導入記事・動画の設計、現行の学習設計を整合させる。Geminiでの過去の試験結果は保持し、現在の採用方針と区別する。アプリ実装・秘密設定・外部サービス・公開環境は変更しない。

## 更新内容

- 全体README、AGENTS、CLAUDE、共通要件・構成・索引に役割分担とADRへの参照を追加。
- GAS／Web／Java／業務自動化の入口、アプリ横断設計に全体方針を反映。
- 導入記事の「受講者はすべてDevin」「Cursorは標準の対象外」という説明を用途別に修正。解説・動画・共通ガイド・準備案内にも反映。
- 現行学習設計のGemini API案内と「Devin等」を修正。
- Geminiでの旧検証結果を含む一覧・試行案・Web横展開記録には、過去の記録と現行方針を区別する注記を追加。
- GAS英語訓練のAGENTS・CLAUDE・G3仕様に残っていたGemini宛先指定を、既存のOpenAI実装に合わせて修正。個別の判断日誌にも追記。

## 主な参照先

- 全体：[README](../../../README.md)、[AGENTS](../../../AGENTS.md)、[CLAUDE](../../../CLAUDE.md)、[索引](../../00_index.md)、[要件](../../01_requirements.md)、[構成](../../02_architecture.md)。
- 学習ルート：[アプリ学習](../../../src/app-learning/README.md)、[GAS](../../../src/app-learning/01-gas-app-learning/README.md)、[Web](../../../src/app-learning/02-web-app-learning/README.md)、[Java](../../../src/java-career-learning/java-career-learning-strategy.md)、[業務自動化](../../../src/office-automation-starter/README.md)。
- 導入資料：[記事設計](../../../src/解説/記事/README.md)、[解説](../../../src/解説/README.md)、[動画](../../../src/解説/動画/README.md)、[学習ガイド](../../../src/解説/AIと学ぶ共通ガイド.md)、[準備案内](../../../src/解説/受講準備・費用・サポートの案内.md)。
- 横断設計：[索引](../../../src/app-learning/docs/README.md)、[学習設計](../../../src/app-learning/docs/02_learning-design.md)、[基盤・検証](../../../src/app-learning/docs/03_platforms-and-validation.md)。

## 確認結果

- 対象30文書を確認。ADR・更新記録・Web移行記録へのリンク35件に欠落なし（本節の参照一覧追加前）。
- `git diff --check` と、未追跡ファイルを含む全文の `git diff --no-index --check` で空白エラーなし。GitのLF／CRLF変換予告は空白エラーとは区別。
- 差分と現行の役割表記を確認。既存の他作業の変更を保持し、コード・設定・公開環境を変更していない。
- 文書のみの変更のためアプリのテスト・実通信・デプロイは実施していない。

## 残る確認

今回の文書更新は全アプリ・公開先の移行完了を示さない。GAS英語・写真日記とWeb共通テンプレートではOpenAIコードの存在を確認したが、全アプリの接続設定・実疎通・公開先は再検証していない。個別の旧Gemini仕様・過去記録はADRの扱いに従う。
