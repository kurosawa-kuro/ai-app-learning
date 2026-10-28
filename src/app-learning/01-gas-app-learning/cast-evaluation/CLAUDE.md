# CLAUDE.md

この教材の作業では[AGENTS.md](AGENTS.md)と[README](README.md)を読む。

## 現行の実装境界（2026-10-28）

- 教育用のCreate／Readを先行する：メンバー登録・一覧、日別実績の登録・一覧、配点の確認、月次集計・同点順位。
- 正本は[基本仕様](<docs/tasks/01_idea/Cast Evaluation System — 基本仕様・設計.md>)の先頭「先行するCreate／Read版」。旧構想より最新の縮小指示を優先する。
- 名前・在籍状態の編集、実績編集、配点変更UIは今回対象外。全部入りの業務システムに広げない。
- Sheetsの列定義・業務規則は[データ設計](docs/05_data_model.md)。UI・業務処理・保存を分離し、過度なクラス階層を作らない。
- サーバーで入力と参照を検証し、ScriptLock内で保存する。再送で二重登録せず、初期化で既存データを上書きしない。
- UIは入力保持・成功／失敗・空状態を表示する。文字列はtextContentで描画する。
- 独自認証・監査DB・復旧UI・AI台帳は追加しない。架空データ、GAS標準の本人限定公開を使う。
- コード・ローカル検証・実GAS受入・公開済みを区別する。現時点はローカル検証まで。

## セットアップ / 主要コマンド

`npm ci`、`npm test`、`npm run test:browser`、`npm run format`、`npm run format:check`。ローカル起動は`npm run dev`。実体はpackage.jsonと[公開手順](docs/08_release_runbook.md)を参照。Makefileの雛形を成功根拠にしない。

3表はmembers/daily_records/evaluation_rules。月合計後に数量配点、売上は月合計から切り捨て。ポイント→売上で同順位1・1・3。配点はSheetsで変更、画面は確認のみ。

## その他の資料

[文書索引](docs/00_index.md)と`.claude/README.md`を参照。旧構想のCRUD・運用要求を、CR版の未完了作業へ戻さない。
