# 04 ワークフロー

[AGENTS.md](../AGENTS.md)の共通方針と対象教材のガイドに従う。教材を整備する開発作業と、学習者への支援を区別する。

## 教材整備を始める

1. README・AGENTS.md・必要に応じてCLAUDE.mdを読み、対象者、本人のゴール、今回の変更範囲・完了条件を決める。
2. 対象教材のREADME・AGENTS.mdと指定された仕様を確認する。既存の変更を破棄しない。
3. 実際のMakefile・マニフェスト・スクリプトから、作業ディレクトリと必要なコマンドを確認する。
4. 中規模以上の変更は[tasks](tasks/README.md)に範囲、構造、受入条件を残す。文言・リンクの小さな修正に重い実装手順を一律に課さない。

```powershell
git status --short
```

ルートのMakefileはTODOを表示する雛形で、`make setup`・`make run`・`make dev`・`make test`等は共通の実行手順ではない。Spring Boot・Javaの戦略資料から、未作成の実行環境やコマンドを推測しない。

| 対象 | 手順を確認する入口 |
|---|---|
| GAS | [教材一覧](../src/gas-app-learning/README.md)から一つを選び、個別のREADME・AGENTS.mdへ |
| Web | [支援戦略](../src/web-app-starter/web-app-support-strategy.md)。実装時に環境・検証・公開手順を確定 |
| Java | [学習戦略](../src/java-career-learning/java-career-learning-strategy.md)。選んだ課題に必要な環境だけ準備 |
| 事務処理 | [教材README](../src/office-automation-starter/README.md)とクイックスタート |

提供者の開発環境が必要な場合は[AIコーディング環境](runbooks/ai-coding.md)を参照する。RTK・Serena等は学習者の受講条件ではない。

## 一人への初回支援

1. 本人の希望から一つの課題を選ぶ。協力者が未定なら候補案として扱う。
2. [初回支援シート](templates/ai-pairing-session.md)に期待結果、支援範囲・枠、未達・不具合時の扱いを記入する。
3. 提供者が同じ環境とサンプルで予行し、操作・期待結果・戻し方を確認する。
4. 本人がAIへの依頼、試行、結果確認を経験する。言語化・操作を補助してよい。
5. 成果と再利用材料を渡し、今回の支援を閉じる。別課題や追加機能は新しい相談にする。

GASで試す場合の[候補案](../src/gas-app-learning/docs/06_first-pairing-pilot.md)を全員の課題に固定しない。事務処理など別の入口も選べる。

## 検証と作業終了

文書変更は正本との整合、リンク、差分を確認する。コード変更は対象教材で定めた実際の検証を実行する。[検証方針](07_test_strategy.md)に従い、未実施事項を合格扱いしない。

```powershell
git diff --check
git status --short
```

対象・版・環境・実行結果・未確認事項を残す。作業記録がある場合はVerificationを更新し、確定内容を共通文書または個別教材の正本へ反映する。コミット・公開・外部送信は依頼された範囲で行い、文書更新から自動的に派生させない。
