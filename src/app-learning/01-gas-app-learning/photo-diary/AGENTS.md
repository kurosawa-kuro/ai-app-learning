# AGENTS.md

全コーディングエージェント共通の作業規約。導入・現状・検証実績は[README](README.md)、確定仕様の案内は[文書索引](docs/00_index.md)。文言・コメント・文書は日本語で書く。

## 範囲と正本

- Webと揃える日付・複数タグ・管理・入力上限は[基本機能仕様](docs/specs/gas-baseline.md)。旧6タグ以上の記録を削除せず、日付列追加は明示的なupgradeDiaryEntryDateで行う。

- 本人専用の写真日記。GAS・Sheets・Drive・Geminiを使用する。保存済み日記の編集・削除、独自ログインは対象外。`#perf`は一時的な計測機能として残る。
- 現行DBは`v2_`接頭辞の10表。[DB v2仕様](docs/specs/database-v2.md)と[データモデル](docs/05_data_model.md)、列定義は`src/server/db/tables.js`を参照する。
- 業務の責務は[Domain / Application設計](docs/specs/application-domain-architecture.md)に従う。旧4表・6表、CacheServiceだけの重複防止、旧表の自動削除は過去実装。
- コマンド・挙動はソースと`src/package.json`で確かめる。過去の「試行データは消してよい」を、現在のデータ削除の許可として使わない。Gitの実状態を確認し、既存変更を破棄しない。

## 責務の境界

| 場所 | 責務 |
|---|---|
| `server/domain/` | 外部状態に依存しない業務判断・入力ルール |
| `server/application/` | 注入されたポートを使う処理順序・予約・復旧 |
| `server/bootstrap/` | Applicationと具体実装の組立 |
| `server/services/` | 既存Service名の互換窓口、provider、運用・移行処理 |
| `server/models/` | 表の読み書きと関連の組立 |
| `server/db/` | Sheets操作・定義・キャッシュ・初期化 |
| `server/controllers/`・`presenters/` | 公開入口・応答、画面向け変換と日時の文字列化 |
| `client/core/`・`views/` | 通信・履歴などの共通機能、各画面の描画と操作 |

- 上表のパスは`src/`起点。`SpreadsheetApp`は`db/sheet-store.js`、`google.script.run`は`client/core/api.html`、履歴APIは`client/core/router.html`に閉じる。Domain / Applicationへ具体的GASサービスを追加しない。
- GASの大域は共有される。他モジュールはファイル読込時ではなく関数内から参照する。公開関数はcontrollers、内部の大域関数は末尾`_`。エディタ用というコメントだけではRPC呼出を禁止できない。
- 写真・AIの具体処理はproviderに閉じる。追加は実装・窓口への登録・設定変更を組にする。旧ダミー画像の表示とmock切替を維持する。

## レビューから得た再発防止

| 壊れやすい前提 | 維持する実装・検証 |
|---|---|
| エディタで動けばWebでも保存先を取得できる | Webは`DIARY_SPREADSHEET_ID`＋`openById`。active取得は明示的な保存先登録だけ。未設定・登録先不一致・activeなしを検証 |
| JSON.stringifyすればscript内に埋め込める | 起動JSONは`serializeForScript_`で`<`等を符号化。保存済み本文を含む実HTMLで`</script>`が実行されず原文へ戻ることを検証 |
| 書式を`@`にすれば数式にならない | `SheetStore.writeValues_`で先頭`=`・`'`を保護してRichTextで原文を確定。日時・数値型、補正途中の障害、同ID再送を検証 |
| ロックがあれば書込が確定し、複数表が原子的になる | キャッシュ新世代公開前・ロック解除前にSheetStore経由でflush。失敗時は成功扱いせず、例外時もロックを解放。複数表の途中停止は要求台帳で復旧 |
| AI予約がメモリ上で成功すれば送信できる | 予約の書込確定後にロック外で外部呼出。確定失敗時の呼出ゼロ、応答喪失後の再送で再生成しないことを検証 |
| 模擬GASの全テスト成功は本番保証になる | mockが再現していない制約を確認し、Node・実Chromium＋模擬通信・実GASの証拠を分ける |

回帰テストは`src/tests/gas-safety.test.mjs`、復旧系は`database-v2.test.mjs`・`resilience.test.mjs`。修正時は実装だけでなく、元の不具合を検出できる検証を残す。

## データ・画面・設定

- 書込は`withLock_`内。入力・参照先・一意キーを検証して子（post_assets・post_tags）→親（posts）の順に保存する。保存・AI生成はrequestId必須、同ID異内容は拒否する。
- 表示は`read/readMany`、更新判断・要求照合・整理は`readFresh/readManyFresh`。キャッシュを永続台帳の代わりにしない。保存直後の無目的な再読込を増やさない。
- Seederは新規環境専用。旧表の移行、欠損表の復旧、生成結果不明の中止は[Runbook](docs/08_release_runbook.md)に従う。`onEdit`はシート削除で発火しない。
- RPCにDateを含めずpresenterで文字列化する。フォームは`.value`で設定し、空判定で`||`を使わない。日時処理に`toISOString()`を使わない。
- UI色は`client/vendor/admin-pico/admin-theme.html`、他は`--admin-*`。ダミー写真の`photo-view.html`は例外。配色変更はコントラストを検証し、チップの箱へPicoの連結ボタン用`role="group"`を付けない。
- 設定・マスターは`env/`から生成し`Settings/MasterData`経由で読む。`generated.js`・`generated-preferences.js`は直接編集しない。文体は`env/diary-preferences.md`の対象箇条書きだけを生成し、起動CONFIGへ含めない。
- 秘密は実行時のScript Properties、ローカルはGit除外済み`env/secret.yaml`。自動同期・Doppler連携は未実装。秘密・clasp認証情報をログ・文書・生成物へ出力しない。

## 検証と反映

コマンドは`src/`で実行する。

- 実装変更：関連回帰テストと`npm run check`。画面・起動HTML変更は`npm run test:browser`も実行。env変更時は`npm run build:data`後に生成差分を確認する。
- 文書のみ：リンク先、コマンド、実装との整合を確認する。日記にはlint・formatter・開発サーバーは未設定。Makefileを実動コマンドとして案内しない。
- 反映は検証→`npx clasp show-file-status`→`npm run push`→必要な保存先登録・診断→`npm run deploy`。詳細は[Runbook](docs/08_release_runbook.md)。文書更新をデプロイ依頼と解釈しない。
- `.claspignore`が許可するmanifest・server JS・client HTMLだけを送る。pushは`--force`、公開更新は別操作。既存デプロイIDとURLを維持する。
- 報告は変更内容・検証結果・未確認事項・反映の有無を分ける。実API未送信や実機未確認を明示し、過去のテスト件数・版番号を今回の実績にしない。

## 文書とツール固有設定

確定仕様は`docs/specs/`または01〜08、作業経緯は`docs/tasks/`、判断理由は`docs/decisions/decision-log.md`へ置く。入口3文書へ時系列ログを追記し続けない。

[CLAUDE.md](CLAUDE.md)と`.claude/rules/`・`.claude/skills/`はClaude Code用。共通ルールは本書へ置く。AI制御の詳細は[.claude/README](.claude/README.md)と[実行手順](docs/specs/runtime-protocol.md)・[変更境界](docs/specs/change-boundary.md)・[権限境界](docs/specs/capability-boundary.md)・[証拠方針](docs/specs/evidence-policy.md)。他プロジェクトのpermissionsや保護パスをそのまま流用しない。
