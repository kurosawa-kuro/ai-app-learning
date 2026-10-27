# 04 ワークフロー

## 開始前

[README](../README.md)・[CLAUDE](../CLAUDE.md)・[AGENTS](../AGENTS.md) と [タスク索引](tasks/README.md) を確認する。変更目的・対象・完了条件を明確にし、実装を変える場合は関連するテストを把握する。

現在 .git は存在しない。git status / diff を必須手順とせず、実ファイルの比較・内容検査で変更を確認する。依頼されていない git init は行わない。

## セットアップ

Node.js 20 以上を使用し、npm と clasp は src/ で実行する。

```powershell
cd C:\Users\owner\.ssh\dev\ai-app-learning\src\gas-app-learning\photo-diary\src
npm install
```

Makefile は TODO のテンプレートで、make setup / dev / test / fmt は実用手順ではない。開発サーバー・lint・formatter の npm script も未設定。GAS 上のアプリと、Node.js＋jsdom のローカルテストを区別する。

## 生成パスの修復記録（2026-10-24）

2026-10-24：生成スクリプトと生成テストの参照先を env/ に修正し、npm test は全48件成功。40ファイルを push し、既存デプロイを @11 から @12 に更新した。公開URLは維持。接続可能なブラウザがなく、公開画面・スマホの操作は未確認。

B1 は修復済み。src/scripts/build-data.mjs と src/tests/build-data.test.mjs の入力を env/ に統一し、generated.js を再生成した。

## 開発・検証

```powershell
npm run build:data
npm test
```

npm test は build:data を内包するため、通常は npm test だけで生成と全テストを行える。generated.js は手で直さない。文書のみの変更では参照先・コマンド・基準文書との整合を検証し、アプリのテストを実行していない場合はその旨を報告する。

## GAS への反映

反映が依頼範囲に含まれる場合に [08](08_release_runbook.md) に従う。Apps Script API の有効化、clasp login、接続先の確認が前提。

```powershell
npm test
npx clasp show-file-status
npm run push
npm run deploy
```

失敗した段階で後続の反映を止める。push は公開 URL を更新せず、deploy はビルド・テスト・push を代行しない。

## 終了時

変更したファイルと理由、検証コマンドと結果、未確認事項、push / deploy の実施有無を報告する。未解決事項はタスクへ、確定した仕様は docs の該当章へ反映する。過去の成功記録を今回の結果に流用しない。
