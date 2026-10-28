> 2026-10-28：posts末尾のentry_dateと複数タグ・管理操作は[現行の追加仕様](gas-baseline.md)を参照。旧行は保持し、明示的に日付列を追加します。

# DB v2仕様

2026-10-25ローカル実装。既存公開環境へのpush/deploy・本番移行は未実施。調査背景は [DBリファクタリング](../tasks/03_active/DBリファクタリング.md)。

## データと互換性

### 一覧性能と手動編集の失効

`getAll(tagId, cursor)`と起動HTMLは最大50件を返す。応答は`posts`・`tags`・`tag`に加え、絞込後の`total`と末尾IDの`nextCursor`（最終ページはnull）を含む。続きは同じタグとcursorを送り、「もっと見る」で追加する。新規追記で位置がずれるoffset方式は使わない。cursorが現在の絞込内に無ければ`invalid_cursor`で再取得を案内する。タグ切替・再取得で先頭へ戻り、失敗した追加取得は同じcursorで再送する。遅れた応答は要求順で棄却する。取得済みページの本文・写真を使う詳細表示は維持する。

1,002件の模擬データでは全一覧JSON 473,792バイトに対し初回ページ23,657バイト、初期カード数は50件。各表を一度読む構造は残るため、Sheets読取行数自体を50行にする変更ではない。`#perf`の全件計測は従来どおり全件を変換し、通常画面のページ応答とは区別する。

一覧・起動HTML・計測の表示変換は`DiaryPresenter.list`を通す。要求内で画像資産表を一度だけ読み、資産ID／旧storage_keyのMapと表示結果を再利用する。Drive提供元にも取得済み資産を渡し、代表画像と全画像で再検索しない。詳細は独立した索引を作り、要求間で表示用スナップショットを共有しない。保存・整理のfresh照合は維持する。

共有キャッシュのキーは、書込世代`DB_CACHE_GENERATION`と失効世代`DB_CACHE_INVALIDATION`の組で決める。`clear`／`onEdit`は失効世代も更新し、保存処理は失効世代を上書きしない。保存前のキャッシュは取得時の失効世代へだけ引き継ぐため、保存中の手動編集や遅延書戻しによって旧内容が復活しない。追加プロパティは内部管理値で、未設定は`0`として扱う。手動登録やデータ移行は不要。旧形式のキャッシュは再利用しない。

`src/tests/performance-regression.test.mjs`で画像50／300件とキャッシュ停止下の1,000件を検証し、一覧1回あたり資産表読取1回を確認した。300件の従来計測は1,205回。手動編集は書込開始前・flush中・世代公開後・キャッシュ書戻し中の割込みを検証する。件数と読取回数は模擬GASの結果であり、実GASの所要時間・実行上限を保証しない。

### 保存先と書込確定

2026-10-25レビュー修正（ローカル）：保存先はScript Propertiesの`DIARY_SPREADSHEET_ID`で指定する。既存環境での登録手順は[Runbook](../08_release_runbook.md#更新手順)を参照。通常読取からactiveや別ブックへフォールバックしない。

文字列の先頭`=`・`'`は一括書込時に引用符で保護し、対象セルをRichTextで原文に確定する。後続のRichText書込が失敗しても数式を実行しない。日時はDate、件数・順序等は数値のまま保つ。既存の数式セルを自動変換する処理はない。

キャッシュ新世代の公開前とロック解除前にSheetStore経由で`SpreadsheetApp.flush()`を実行する。確定失敗を成功扱いせず、AI予約の確定失敗時は外部推論へ進まない。例外時もロックは解放する。Sheetsへの複数回書込がトランザクションになるわけではなく、既存の要求ID照合・復旧を維持する。追加flushの実GAS性能は未測定。

物理表はv2_posts、v2_assets、v2_post_assets、v2_tags、v2_post_tags、v2_upload_requests、v2_post_create_requests、v2_ai_generations、v2_ai_generation_assets、v2_schema_migrations。列は [TABLES](../../src/server/db/tables.js) が正本。

画像の業務IDはasset_id。画面の既存file_idフィールドは互換エイリアスとしてasset_idを返す。旧Drive ID・ダミーIDでの参照入力もAssetRepository.resolveで解決する。日記のpost_assetsは必ずasset_idを保存する。新規画像の保存先設定をdummyへ戻しても、登録済みDrive資産はstorage_kindで読み分ける。

requests/uploads/imagesの旧表は読取専用の移行元。移行完了後は通常APIから書かない。転送台帳を消しても資産の表示情報はassetsに残る。ただし要求台帳を消すと同ID再送の保証を失うため、自動削除しない。

## 日記保存

create(data, requestId)はrequestId必須。正規化したtitle/body、順序付きimageIds、重複排除・安定順のtagIds、sourceGenerationId、正規化版2をhash化する。本文は従来の末尾空白除去規約。

同ID・異hashはrequest_conflict。予約→post_assets/post_tags→posts→要求succeededの順で保存する。親がある再送は完了記録を補修して既存日記を返す。親がなければ同じ予約の未完了childrenを除去し、同じ入力で再開する。

cancelCreateは共通ロック内で親の有無を確認する。親があればsucceededとpostId、親がなければcancelled。まだ到着していない要求も中止記録を作り、後から届く保存を拒否する。フォームは送信内容を保持し、変更後の再送ではまず中止／完了照会を行う。完了済みなら保存済み日記を表示する。

旧requestsのhashが空の場合、親があれば互換的に既存日記を返す。親なしはrecovery_requiredとし、明示的中止後の新規要求で作り直す。

## 画像

転送要求を予約してasset_id/recovery_keyを固定→pending資産→Drive作成・照合→assets.ready→転送succeeded。assetsにはrecovery_keyも残し、台帳に依存せず保存ファイル名の一致を検証する。

Drive書込は当面スクリプトロック内。決定的な名前とsha256で作成済みファイルを回復する。同名が複数なら停止。別uploadIdの同一画像は統合しない。

整理候補はDrive資産、readyまたはtrash_pending、保留期間経過、post_assetsと実行中AIから未参照。親のない添付も保護する。実行時にfreshで再確認し、trash_pending→Driveゴミ箱移動→trashed。途中停止は同じ資産IDで再開できる。

pending/running/unknownのAIだけが画像を保護し、終了した履歴参照は永久保護しない。assets行はゴミ箱移動後も残す。完全削除はしない。

## AI

generateDraft(input)もrequestId必須。入力hashは画像の順序、タグ、送信同意、版2から作る。生成時点のタグ名、文体、モデル、上限、実際のプロンプトテンプレートをinput_snapshot_jsonに固定する。画像の順序とhashはai_generation_assetsに保持する。snapshotはUTF-8で24,000バイト以下。

ロック内の予約・参照保護→running→ロック外でprovider実行→ロック内で結果保存。成功結果を保存してから返す。同ID成功は保存結果を返し、再呼出しない。異入力は競合。失敗結果も同じIDで自動再実行しない。

通信結果不明や予期しない実行失敗はunknown。結果保存前に停止したrunningも再送で外部呼出しない。15分経過したrunningを照合対象unknownへ変更する。これは成功／失敗の確定ではない。inspectPendingGenerationsで確認し、元実行が終了したことを確認後、エディタの一時ラッパーからabandonGeneration_(id)で中止できる（最終更新から15分未満は拒否）。遅れて戻る生成結果も状態照合で保存を拒否する。

外部APIの厳密な1回実行は保証しない。結果不明からの再生成は画面の「新しい生成を開始」で明示的に別要求として行う。入力変更がある場合も同じ要求IDに上書きしない。予約前の入力／同意エラーは画面側の要求を破棄して修正可能にする。

source_generation_idは編集を始めた生成結果の由来。日記本文と一致するとは限らず、画面で関連解除できる。手入力保存はAI失敗に依存しない。

## 30日後の手動整理

ユーザー選択：自動削除せず、30日経過した生成履歴を手動整理する。

作成画面の履歴整理からsucceeded/failedの候補を表示。実行中／unknownは候補外。入力snapshot・出力本文・usage・error_code・画像関連を消去し、成功はsucceeded_purged、失敗はfailed_purgedへ変える。ID・要求hash・状態・モデル等の最小メタデータと日記の採用元参照は保持する。失敗した生成を整理しても成功由来には変えない。

本文や画像バイト、APIキーを通常ログに出さない。30日は経過後すぐ消える期限ではなく、手動整理が可能になる期間。

## キャッシュ・制約

見出しの完全一致とTABLE_UNIQUEをSheetStoreで検査。参照・入力・状態はサービス側で検査する。要求照合・整理等はfresh読取。通常表示は90KiB以内の表をキャッシュする。容量境界を超える追記で旧値を再利用しない。

DB_CACHE_GENERATIONがwriting:で始まる間はキャッシュを読み書きしない。書込後に新しい世代を公開し、未更新表のキャッシュだけ引き継ぐ。更新前の遅延読取が旧世代へ書き戻しても、次の読取では使わない。世代保存失敗時は書込前に停止、書込後の失敗は操作台帳から回復する。

## 移行と検証

移行は [リリース手順](../08_release_runbook.md#db-v2の移行手順2026-10-25) を参照。500行単位でコピーし、再実行時は既存prefixとの完全一致を照合する。不一致を自動上書きしない。画像は10件単位で旧名・所有者・共有・内容hashを検証する。旧表に変更があればchecksum不一致で停止する。

ローカル試験は旧Drive名の保持、pending再開、キャッシュ競合の模擬割込み、AI応答後停止、親保存後停止、画像整理後停止、移行再開、30日整理とUI再送を含む。実Sheets/Drive/GASの同時実行・ネットワーク速度・本番移行は別途検証する。
