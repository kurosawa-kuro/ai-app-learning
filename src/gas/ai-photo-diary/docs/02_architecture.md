# 02 アーキテクチャ

GAS（V8）＋ Google Sheets、HTML Service、素の JavaScript の 1 ページ型アプリ。2026-10-25に主要業務へDomain / Applicationの分離と依存注入を導入した。現在の責務・ポート・状態回復の正本は [業務ルールと依存関係の設計](specs/application-domain-architecture.md)。日記・画像資産・AI生成を同一アプリ内で分け、既存の公開APIとDB v2を維持する。本番データ移行・デプロイは未実施。

## 実行の流れ

```text
ブラウザ → doGet → Seeder / 初期一覧 → HTML と CONFIG
画面 → App.api → google.script.run → controller
     → service互換窓口 → Application（Domainで判断）
     → 注入したRepository → SheetStore / TableCache → Google Sheets
     ← presenter ← 日記の集約
```

初期一覧は HTML 配信時の CONFIG に含め、画面からの追加往復を抑える。詳細は一覧データを再利用し、必要時に getOne を使う。保存直後は入力から結果を構成し、表示用の表を読み直さない。

2026-10-25のローカルDB v2では、資産・添付・転送要求・保存要求・AI生成を分離した。AssetRepositoryは画像の正本、GenerationRepositoryは生成入力／結果、DatabaseMigrationは旧表を保持する段階移行を担当する。物理表はv2_接頭辞の10表。公開反映は未実施。[DB v2仕様](specs/database-v2.md)を参照。

## 責務の境界（パスはプロジェクトルート基準）

| 場所 | 責務・制約 |
|---|---|
| src/server/controllers/ | web.js は配信、api.js は業務 API、triggers.js は onEdit、perf.js は一時計測 |
| src/server/domain/ | 日記・画像・生成の純粋な業務判断 |
| src/server/application/ | 注入ポートによる順序・ロック・再送制御 |
| src/server/bootstrap/ | 依存する具体実装の組立 |
| src/server/services/ | 互換窓口、提供元アダプター、運用診断・移行 |
| src/server/models/ | 表の読書きと関連の組み立て。画面向けの整形はしない |
| src/server/presenters/ | 日記の集約を画面用に変換し、日時を文字列化 |
| src/server/db/ | tables.js の列定義、sheet-store.js のシート操作、table-cache.js のキャッシュ、seeder.js の初期化 |
| src/server/core/ | AppError・respond_・withLock_ |
| src/server/config/ | Settings / MasterData、生成物 generated.js |
| src/client/core/ | 通信 api、履歴 router、共有状態 store、日付 format、写真 photo-view、共通 UI |
| src/client/views/ | list・form・detail・一時計測 perf の描画と操作 |
| src/client/index.html・app.html | HTML の組み立て、起動と配線 |
| src/client/styles/・vendor/admin-pico/ | アプリの見た目とテーマ |

SpreadsheetApp は sheet-store.js、google.script.run は api.html、履歴 API は router.html に閉じる。GAS の大域は共有されるため、他ファイルのモジュールは関数内で参照し、読み込み順に依存しない。公開関数は controllers に置き、内部の大域関数は末尾 `_` にする。

## 写真・下書きの差し替え

PhotoService / DraftService が窓口で、現在は DrivePhotoProvider / GeminiDraftProvider を使う。新しい提供元は既存と同じ契約で実装し、サービスの providers_ に登録して env/config.yaml を切り替える。日記処理・presenter・画面に提供元固有の分岐を散らさない。Drive・Geminiの確定仕様は [写真・Gemini連携](specs/photo-gemini-integration.md) を参照する。

保存済み画像の読取providerはassets.storage_kindで選ぶ。新規保存先設定とは独立する。AI生成は短いロックで予約し、外部呼出をロック外で行い、結果を再び短いロックで保存する。入力snapshotと採用元IDを保持し、30日後に生成内容だけ手動整理できる。

## 利用手順と依存先

| 操作 | 通る部分 | 確認すべき依存 |
|---|---|---|
| 一覧・絞り込み | doGet / getAll → DiaryService → repository → presenter → list | GAS、Sheets、初期データとキャッシュ |
| 下書き取得 | form → generateDraft → DraftService → provider | 入力検証、Geminiの構造化出力の再検証 |
| 保存 | create → withLock_ → validator → repository → SheetStore | ロック、参照整合、文字列の書式、requestId |
| 詳細・戻る | detail / list / router、必要時 getOne | 共有状態、GAS 履歴 API、スマホの挙動 |

Pico CSS は CDN から読み込む。UI 色は admin-theme.html の値を --admin-* 経由で使う（ダミー写真描画は例外）。日時を通信に Date のまま含めない。

## ローカル設定と公開

GASエディタの運用はcontrollers/setup.jsからSetupService／PerformanceServiceへ委譲し、診断用読取はSetupRepositoryへ分離する。読取診断・キャッシュ失効・移行・実データ作成を別入口にする。用途と計測範囲は [診断・性能チェック](specs/setup-operations.md) を参照。

env/ の設定・マスターは生成して GAS に渡す。生成処理とテストの旧 data/ 参照は修復済み。手順は [04](04_workflows.md) を参照。GAS へは .claspignore が許可した manifest・server JS・client HTML だけを送る。

公開設定は MYSELF / USER_DEPLOYING / Asia/Tokyo。Doppler 連携や独自の認証基盤は実装されていない。共通作業規約は [AGENTS.md](../AGENTS.md) を参照する。
