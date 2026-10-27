# GASエディタの診断・性能チェック

2026-10-25ローカル実装。入口は [setup.js](../../src/server/controllers/setup.js)。GASへのpush/deploy・実環境での計測は未実施。

## 最初に実行する関数

1. `showSetupGuide`：目的別の操作一覧を実行ログへ出す。DB・Drive・Geminiにアクセスしない。
   保存先未登録の場合は、対象スプレッドシートのGASエディタで`bindDatabaseSpreadsheet`を実行する。`DIARY_SPREADSHEET_ID`とキャッシュ世代だけを設定し、既存業務表は変更しない。登録先とactiveのIDが異なる場合は停止する。Web起動では登録IDを`openById`で開く。
2. `inspectApplicationSetup`：DB・provider設定・Drive読取・Geminiキーの設定有無を確認する。初期化・移行・外部推論は行わない。
3. DBの問題や移行途中なら `inspectDatabaseV2`、速度を調べるなら `checkPerformance`。

GASエディタの実行関数から選び、実行ログを確認する。各出力にはoperationを付ける。公開入口は値を返さないが、末尾に_がないため技術的にはgoogle.script.runからも呼べる。エディタ専用の認可を実装したという意味ではない。アプリは既存のMYSELF運用を維持する。

## パフォーマンス

| 入口 | 計測内容 | 影響 |
|---|---|---|
| checkPerformance | 全表の直接読取＋通常一覧を最大3回 | 通常読取のキャッシュ充填。業務データ書込なし |
| checkDatabasePerformance | 各表1回のfresh読取・行数・サイズ | Sheets読取のみ |
| checkListPerformance | 一覧取得とpresenter変換を最大3回 | 既存キャッシュを使用／充填 |
| checkColdListPerformance | キャッシュ世代を更新してから一覧を最大3回 | 共有キャッシュの明示的失効。業務データは不変 |
| checkPhotoPerformance | 台帳順でreadyのDrive画像を最大3件取得・検証 | 実Driveへの読取。画像作成・AI推論なし |

DB v2有効・全表の見出し一致が前提。未初期化環境ではsetup_requiredで止め、計測のためにサンプル日記を作らない。画像性能チェックはcheckPerformanceに含めず、個別に実行する。

### 結果の読み方

- DB：name、rows、readMs、serializedBytes、cacheEligible。readMsはSheets読取と行変換、サイズ計算の時間はtotalMsだけに含む。serializedBytesはキャッシュ形式のJSONサイズ。
- 一覧：各回のserverMs、rows、payloadBytes、cacheBefore/cacheAfter。summaryは最小・中央値・最大・平均時間。payloadBytesは一覧応答本体のUTF-8 JSONサイズで、HTTPやRPCの付加情報を含まない。
- キャッシュ：tablesPresentはその時点で取得できたキャッシュの表名。2回目でも大容量表や期限切れの表はDBを再読取する。enabled=falseは書込中や世代取得不能でキャッシュを使わない状態。enabled=trueでもCacheService障害やmissはあり得る。
- 画像：assetId、成功可否、serverMs、bytes、mimeType。失敗は安全なcodeを記録し、次の画像へ進む。集計時間は成功分だけ。

計測前のスキーマ確認・診断用キャッシュ観測、一覧のサイズ計算はserverMsに含めない。画像の候補選択の台帳読取も各画像のserverMsには含めない。基準値との機械的な合否判定はしない。件数・容量・キャッシュ条件を揃えて比較する。

DB・一覧・画像の各計測は20秒を目安に次のサンプル開始を止める。既に開始したサービス呼出を中断する制限ではない。DBはcompleteとtableCount、一覧はcompleteとcompletedSamples、画像はplannedSamples/completedSamplesを見て打切りを判別する。全表や全件が測れたと推測しない。

1回目も既存キャッシュを使い得る。cold入口も、他の実行が同時にキャッシュを充填すれば完全なcoldとは限らない。cacheBeforeで条件を確認する。同時のデータ更新・外部サービス変動により件数や値も変わり得る。

これはGAS内部の処理時間。ブラウザからの往復、GAS起動待ち、HTML描画、画像転送・デコード、スマホの体感時間は含まない。ブラウザ側の往復計測は既存の#perf、PC／スマホ画面確認は別途行う。Geminiの推論速度を計るために通常診断から実APIを呼ぶことはしない。

## 初期化・移行

| 入口 | 役割 |
|---|---|
| inspectDatabaseV2 | empty / migration_required / initialization_incomplete / repair_required / unsupported_version / readyを判別。表の見出し・件数・移行記録とnextを表示 |
| initializeDatabaseV2 | 新規環境だけを初期化。旧表は拒否 |
| resumeInitializeDatabaseV2 | 新規初期化途中を再開。既存v2の欠損復元には使わない |
| auditDatabaseV2 | 旧6表の監査。まだDrive実体は未検証 |
| migrateDatabaseV2 | 最大500行をコピー。resumeなら再実行 |
| verifyDatabaseV2Files | 最大10画像の読取照合。resumeなら再実行 |
| activateDatabaseV2 | 再照合後にv2を有効化。公開デプロイは別操作 |
| clearDatabaseCache | ロック内でキャッシュ世代のみ更新 |

総合診断のreadyForVerificationは準備状態であり、業務フロー成功の証明ではない。inspectDatabaseV2も全データのFKや実Driveの存在を保証しない。移行前のバックアップ・書込停止・復旧は [08](../08_release_runbook.md) に従う。

## 未完了処理・整理

- inspectPendingSaves：pending/legacy_pendingの保存要求ID、postId、親の有無、更新日時。親ありは応答・完了記録の回復候補。
- inspectPendingUploads：転送要求ID、資産ID、期待ファイル名、作成日時。
- inspectPendingGenerations：pending/running/unknownの生成ID、状態、更新日時。
- inspectCleanupCandidates：未添付画像と30日経過した生成履歴の候補。削除・中止は行わない。

候補ログは件数totalと先頭50件items、shown/truncatedを表示する。50件超の全件確認は対応するサービスをエディタで絞り込んで行い、先頭50件を全件と扱わない。本文・入力snapshot・画像base64・APIキーはログに出さない。

個別の保存中止は一時ラッパーからcancelPendingSave_(requestId)、生成の中止はabandonGeneration_(id)。例としてエディタ内に `function runSelectedRecovery() { console.log(JSON.stringify(cancelPendingSave_("対象の要求ID"))) }` を一時作成して実行する。対象を確認してから実行し、ラッパーは使用後に取り除く。生成は実行終了・15分経過の確認が必要。画像・履歴の整理は既存の作成画面を使う。

## 実データを作る検証

testGeminiHelloは固定入力でGeminiを1回呼び利用枠を消費する。testPhotoDiaryFlowは固定1px画像2枚と日記2件を保存する。通常診断・性能チェックから自動実行しない。

## 実装と検証

setup.jsは説明付きの入口とログ整形、SetupServiceは状態判定と次の操作、SetupRepositoryは診断用の読取、PerformanceServiceは計測を担当する。既存の業務サービス・移行サービスを再利用する。予期しない例外は生のエラー詳細をログへ出さず、GAS実行を失敗として終える。

2026-10-25：npm test全104件成功。追加8件で、診断による空環境の非変更、未移行時の停止、本文を出さない計測、キャッシュ失効の分離、画像最大3件、取得失敗の個別記録、未完了確認の非変更、例外詳細の非露出を検証。模擬GASの結果であり、実GASの測定値は未取得。今回UI変更はないためブラウザ試験は再実行していない。
