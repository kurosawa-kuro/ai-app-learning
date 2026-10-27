# 写真・Gemini連携仕様

2026-10-24の写真・Gemini実装を、2026-10-25にDB v2へ更新。v2はローカル実装済み・公開反映未実施。永続化と状態遷移の正本は [DB v2仕様](database-v2.md)。実環境での完了状況は [進行中タスク](../tasks/03_active/README.md) を参照する。

## 設定

- env/config.yaml：providers.photo=drive、providers.draft=gemini。dummy/mockへの切替も可能。ai.model、maxOutputTokens、uploadsの上限を検証してビルドする。
- GAS Script Properties：PHOTO_FOLDER_ID、GEMINI_API_KEY。GEMINI_MODELはG2診断用の上書きで、日記生成はconfig.yamlのai.modelを使う。
- env/secret.yaml：ローカル保管のみ。GASへの自動同期なし。キー・認証ヘッダー・APIエラー本文はログに出さない。
- env/diary-preferences.md：「文体」「内容のルール」の箇条書きのみ、UTF-8で4KiBまで採用。生成先はserver/config/generated-preferences.js。初期HTMLのCONFIGへ含めない。背景情報などの任意項目は採用しない。

## 画像保存と表示

選択→ローカルプレビュー→アップロード→日記保存の順。JPEG/PNGの静止画のみ。元画像10MiB・4000万画素以下をブラウザで長辺1600px以下に縮小し、1MiB以下のJPEGへ再符号化する。原本やEXIFは保存しない。GIF・動画・APNG等は拒否。JPEG変換できない画像も拒否する。

GASでもbase64・容量・MIMEとヘッダー・画像寸法・PNGアニメーションチャンクを検査する。画像デコーダー全体の代替ではない。1投稿最大3枚・合計3MiBまで。サーバーの保存先は設定フォルダに限定し、フォルダとファイルの所有者・非公開・追加共有なしを検証する。

画像選択・縮小・送信状態を各画像に持つ。送信は逐次処理。失敗した画像は同じuploadIdで再送する。未送信・送信中・失敗画像がある間は日記保存とAI生成を止める。失敗画像を明示的に外せば成功分だけ保存できる。前へ／後へで順序を変更し、先頭を代表画像とする。

一覧・詳細のレスポンスには画像バイトを含めない。表示対象になった画像をGAS経由で取得し、ブラウザ内では最大12件の取得結果を再利用する。取得失敗は代替表示とクリックによる再試行を提供する。保存画像自体を縮小する方式を採用し、別サムネイルファイルは作らない。公開Drive URLや共有変更は使わない。

## 台帳と整合

v2は旧6表を保持してv2_接頭辞の10表へ移行する。画像資産assets、添付post_assets、転送upload_requests、保存post_create_requests、生成ai_generations/ai_generation_assetsを分離する。正確な列は [データモデル](../05_data_model.md) を参照。

| 表 | 列 | 用途 |
|---|---|---|
| upload_requests | upload_id, asset_id, payload_hash, recovery_key, state等 | 転送前の予約と結果 |
| assets | id, storage_kind, storage_key, recovery_key, sha256, mime_type, byte_size, state等 | 保存された画像の正本 |
| post_create_requests | request_id, post_id, payload_hash, state等 | 日記保存の永続照合と中止 |

アップロードはロック内で予約→ファイル作成→ready更新。ファイル名はuploadIdとSHA-256から決める。ファイル作成後に応答や台帳更新を失っても、同名ファイルとハッシュで照合して回復する。同じuploadIdで異なる内容は拒否する。同名が複数あれば自動的に選ばず停止する。

日記保存はpost_create_requestsでpost_idと入力hashを予約し、子→親の順に書く。同ID異内容は拒否。同内容の再送では親があればそれを返す。親がなければ同じpost_idの未完了childrenを除去して再試行する。参照先検証・画像整理・日記保存は同じスクリプトロックを使う。

添付はpost_assetsが正本で、assetsへpost_idを重複保存しない。途中書込の添付と実行中AIの参照を削除保護する。GASの複数サービス間の原子的トランザクションではなく、永続記録で回復する。APIのfile_idは互換フィールドとしてasset_idを返す。

## AI生成

DraftService→GeminiDraftProvider→GeminiClient。選択したキーワードと、台帳・所有者・保存先・ハッシュを検証した実画像だけを送る。ダミー画像は送らず、ダミー画像しかない場合はキーワードを要求する。画像取得失敗を黙って省略しない。

生成requestIdと入力を予約し、外部呼出はロック外で行う。成功結果・入力snapshot・利用量を保存してから返す。同ID成功の再送は結果を再取得する。結果不明時は自動再実行せず、明示的な新規生成へ切り替える。日記には採用元生成IDを任意保存し、画面で解除できる。30日経過した生成内容は手動整理でき、保存済み日記本文は残る。

モデルはgemini-3.5-flash-lite、出力上限2048トークン。JSON Schemaでtitle/bodyを要求し、受信後も文字列・空・入力上限を検証する。途中終了・不正JSON・空・ブロック・401/403/404/429/5xxを失敗扱いにする。自動再試行なし。失敗時もフォームの入力を維持し、手入力保存できる。

無料枠を利用するため、送信前に個人情報・機密情報を含まないことを利用者が確認する。実際の私的な日記・写真を送る用途へ進める場合は、利用条件と課金状態を改めて確認する。Drive保存だけではGeminiへ送信されない。

## 未添付画像の整理

作成フォームの「未添付画像の整理」から候補を確認する。24時間以上経過、readyまたはtrash_pending、添付・実行中AIから未参照を満たすものが候補。Driveで内容を確認後、個別にゴミ箱へ移動する。削除直前に同じロック内で参照を再確認し、trash_pending→Driveゴミ箱→trashedと進める。中断後は同じ資産で再開する。自動削除・完全削除はしない。

pendingの予約は候補から外す。GASエディタのinspectPendingUploadsでIDと期待ファイル名を確認し、元画像を同じIDで再送するか管理者が照合する。判別できないものを推測で削除しない。途中書込の添付参照は日記の再送回復または要求の明示中止で処理する。

## 検証と反映

Drive画像は読み込み中の状態を表示し、仮の写真は描かない。取得結果をブラウザでデコードできた場合だけ実画像を表示する。1×1px画像は寸法を明示して白い空欄と区別する。取得・デコード失敗時は失敗表示と再取得ボタンを出し、再取得クリックで詳細画面へ遷移しない。tests/browser/photo-loading.mjsで通信前後の状態と画像デコードを実Chromiumで検証する（通信先は模擬）。

画面内の「一覧へ戻る」は、現在のタグ条件の一覧ルートへ直接切り替え、GASの履歴エントリをreplaceする。window.history.backは呼ばない。GAS外側の履歴や旧books画面へ戻ることを避けるため。ブラウザ自身の戻る操作では従来どおり書きかけ確認を行う。

- npm test：模擬GAS・jsdomで成功／失敗／再送／部分書込／順序／削除競合を検証する。Canvas・Drive・Sheetsの実機そのものではない。
- npm run test:browser：実ChromiumでJPEG/PNGの読込・Canvas縮小、失敗分再送、並び替え、同意確認、生成・編集・保存・再読込、未添付画像整理をPC幅とスマホ幅で検証する。初回はnpx playwright install chromium。通信先は模擬GAS/Drive/Geminiで、公開アプリ接続やスマホ実機の代替ではない。測定結果はsrc/test-results/browser-acceptance.jsonへ記録する。
- node scripts/verify-gemini.mjs：明示した時だけ実APIを使用。個人情報のないキーワードと1px作例を送る。任意のケース名を引数に指定可能。本文・キーは出力しない。
- testPhotoDiaryFlow：GASエディタから実行。固定検証画像2枚と日記2件を作成し、再送・読取・順序を検証。固定IDで再実行可能。作成物はログのIDで追跡し、勝手に消さない。
- 公開画面：JPEG/PNGの実ファイル選択・縮小、再読込後の画像表示、AI下書き→手直し→保存、2枚目失敗と再送を確認する。PC/スマホの所要時間・容量を記録する。

反映はnpm test→clasp show-file-status→npm run push→npm run deploy。既存URLを更新する。追加権限の承認が必要なら所有者がGASエディタで実行する。障害時はprovidersをdummy/mockへ戻してビルド・検証・同じデプロイを更新する。実画像を含む日記はDrive設定での表示が必要なため、旧版へ戻すだけで全画像表示が保たれるとは扱わない。
