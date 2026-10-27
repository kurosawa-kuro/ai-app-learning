# 05 データモデル

2026-10-25：ローカル実装はDB v2。実環境への移行・公開反映は未実施。詳細な状態と運用は [DB v2仕様](specs/database-v2.md)、導入手順は [08](08_release_runbook.md) を参照する。

## 正本と設定

日記の確定本文はposts、画像資産はassets、添付と順序はpost_assetsが正本。転送要求・保存要求・AI生成は別の寿命を持つ。保存先のDrive IDを日記のFKにしない。

設定はenv/config.yaml、タグはenv/tags.csv、初期データはenv/sample-data.yaml、文体はenv/diary-preferences.md。Settings/MasterData経由で読み、generated.js/generated-preferences.jsは手動編集しない。秘密値はScript Propertiesに置き、履歴・ログ・生成物へ含めない。

## 表

論理名にv2_を付けた物理シートを使う。正確な列順・テキスト列は [tables.js](../src/server/db/tables.js) のTABLES、一意キーはTABLE_UNIQUEを参照。

| 論理名 | 正本・主な関係 |
|---|---|
| posts | id、title、body、created_at、source_generation_id。採用元は任意 |
| assets | id、storage_kind、storage_key、recovery_key、SHA-256、MIME、容量、状態、日時 |
| post_assets | id、post_id、asset_id、sort_order。画像資産は複数日記から参照可能 |
| tags | id、name |
| post_tags | post_idとtag_idの組 |
| upload_requests | upload_id、asset_id、payload_hash、recovery_key、状態、日時、error_code |
| post_create_requests | request_id、post_id、payload_hash、状態、日時、error_code |
| ai_generations | 要求ID、入力hash、provider/model、指示と入力のsnapshot、状態、生成結果、利用量、同意時刻・版 |
| ai_generation_assets | generation_id、asset_id、sort_order、生成時のsha256 |
| schema_migrations | version、name、checksum、state、started_at、completed_at、checkpoint |

TABLES.keyは更新対象／空行の識別。Sheetsに物理PK・FKはない。SheetStoreが追記・更新前に一意キーを検査し、serviceが参照・枚数・状態を検査する。post_assetsは(post_id,asset_id)と(post_id,sort_order)、post_tagsは組が一意。予約中に空の保存先IDや、未到着要求の中止記録の空post_idは許す。

全ID・JSON・本文等は書式なしテキスト。日時は内部Date、APIでは文字列。見出しの順序・欠落・余分な列を検出した場合は書込を止める。

## 初期化と移行

新規環境のみSeederが10表と初期データを用意する。初期化途中の再開はエディタのresumeInitializeDatabaseV2。旧6表がある場合はmigration_requiredで止め、通常起動では移行しない。v2有効後の欠損表も自動再作成せず、復元を要求する。booksを含む旧シートを起動時に削除しない。

移行は旧表を保持し、ID・本文・日時・順序をv2表へコピーする。画像資産IDは旧upload_idから安定生成し、Driveの旧ファイル名をrecovery_keyへ保持する。旧requestsの元入力hash・要求日時、過去のAI由来は復元できないので空のまま残す。

## 保存とキャッシュ

日記は保存要求予約→子→親→要求完了。親が表示上のコミット点であり、Sheets全体の原子的トランザクションではない。同requestIdの異内容を拒否し、親ありの再送は既存結果を返す。

通常読取はSheetStore.read/readMany、整合性判断はreadFresh/readManyFresh。キャッシュはスクリプト単位・v2名前空間で、永続世代DB_CACHE_GENERATIONを使う。書込中はキャッシュを利用せず、成功後に新世代を公開する。容量超過・破損時はDBへ戻る。書込前の世代保存に失敗すれば書込も止める。

現在は1つのバインド先スプレッドシートを使う。複数データセットを同じGASで扱う機能はない。手動編集はonEditで世代更新。シート削除はonEditが発火しないため、表示がTTLまで残る可能性はあるが、保存前の見出し検査では欠損を拒否する。
