# GAS 5教材：残作業と実施記録

更新日：2026-10-28。対象は利用者が指定した教育用の基本体験。評価・ショップはCreate／Readまでを今回の完了範囲とする。音声・決済・在庫・監査・独自認証・編集機能の追加を、この作業へ混ぜない。

接続方法と承認の分担は[通常ChromeでのPlaywright検証手順](../runbooks/gas-playwright-chrome.md)を参照。

## 現在地

**写真日記は@20、英語は@3へ更新し、OpenAI API方式で実通信成功。5教材全体の残作業は、下表の未確認項目と露出したAPIキーの再発行・再登録。未確認を完了扱いしない。**

| 教材 | 今回の基本範囲 | ローカル検証 | 実GASで確認したこと | 残ること |
|---|---|---|---|---|
| 評価 | メンバー・実績作成、一覧、配点確認、月次集計 | Node 7件、PC／スマホ2ケース | 本人限定@1。教材ひなた追加→ドリンク2・ボトル1・売上12000円保存→5.00 pt。同点順位1・1・3、同日重複拒否、ページ再読込後の保持。1440／390pxスクショ確認 | Sheets行との直接照合、初期化再実行後の保持確認 |
| ショップ | カートなし直接注文、一覧・明細 | Node 8件、PC／スマホ4ケース | 本人限定@1。1800円注文・明細2件、再読込、同ID再送で注文1件のまま、ユーザー切替で別人の明細を隠す。PC／390pxスクショ確認 | Sheets行との直接照合、初期化再実行後の保持確認 |
| 写真日記 | 写真・AI下書き・手直し・保存、日付、複数タグOR絞込み、タグ管理 | Node 162件、PC／スマホ操作、画像デコード・失敗再試行 | 本人限定@20。日付列追加、旧6件保持。OpenAI画像下書き→手直し→日付・2タグ保存→再読込で640px画像を表示 | キー再発行・再登録 |
| 英語 | 自由記述クイズ・AI採点、短い自由会話、振り返り、履歴 | Node 76件、PC／スマホ2ケース | 本人限定@3。OpenAI実採点・会話往復成功。会話往復→終了→日本語振り返り→再読込・履歴表示も成功 | キー再発行・再登録 |
| じゃんけん | スキルなし対戦・勝敗・得点・履歴 | Node 4件、PC／スマホ2ケース | 本人限定@1。初期化完了、グー対グーであいこ1点、再読込で1点・1回、同ID再送でも1点・1回。1440／390pxスクショ確認 | Sheets行との直接照合、初期化再実行後の保持確認 |

ローカル試験のGAS／Sheets／Drive／Geminiは模擬。上表の実GAS欄は、通常Chromeへ接続したPlaywright Extensionによる実操作・実RPCの結果。push・deploy成功だけでは受入済みとしない。

## 完了までの順番

1. **ブラウザー接続済み**：ユーザーがPlaywright Extensionの「GAS acceptance」を承認。通常ChromeのGoogleログインを使い、こちらから検証できる。初回Google権限承認のみ本人が実施。対象URLでタブを特定し、ユーザー操作と競合させない。
2. **評価・ショップ・通常じゃんけんの最終照合**：主要操作は上表のとおり成功。専用Sheetsの行と画面を照合し、初期化再実行がデータを消さないことを確認する。
3. **日記の既存環境更新**：コピー保全・保存先登録まで完了。`upgradeDiaryEntryDate`で既存5列・行を保持して末尾に`entry_date`を追加し、直後に同じデプロイIDを更新。新規初期化・DB v2再移行はしない。
4. **英語の認証と実AI確認**：利用者の最終指定によりOpenAI APIキー方式を採用。GCP OAuth方式は採用しない。実採点・会話は成功。具体的な設定は各教材の `docs/openai-setup.md`。
5. **日記・英語の実画面受入と最終記録**：保存・再読込・画像・AI・PC／スマホを確認し、残項目を実際に完了して更新する。

### 実環境の証拠（2026-10-28）

- ショップ：教材はるか、注文ID `df6b386b-3675-45ac-9f21-21043feb977e`。学習カードセット1200円＋学びのノート600円。実RPCの同ID再送前後とも注文1件・1800円。
- 評価：教材ひなた（`2830904e-265a-4320-bdda-dd5f697b4ab3`）を追加し2026-10-28の実績を保存。既存の教材あおいと同点1位、教材さくら3位。二度目の送信は登録済みとして拒否。
- 通常じゃんけん：対戦ID `576f9706-436e-4740-93c9-cf0703eb5a4c`。グー対グー、あいこ1点。同ID再送とページ再読込で得点・件数維持。
- スクショ保存先：`C:/Users/owner/.codex/tmp/gas-cr-release/playwright-output/`。`shop-debug.png`、`shop-live-390-top.png`、`shop-live-390-detail.png`、`cast-live-1440.png`、`cast-live-390.png`、`janken-live-1440.png`、`janken-live-390.png`を実際に開いて確認。390px幅で横はみ出しなし。ショップ／評価のネストiframeではクリック前のスクロールが必要な場面があり、一部操作は表示・有効状態を確認してPlaywrightのforceクリックを使用。物理スマホでの実機確認とは区別する。
- 日記の保存先：`1ixddBiURrLAoZufFWE00_eNWGjyrGfIOHlIRaM7UKng`（crud-poc）。更新前コピー：`1WzceorlUCtYG_Gb9laRn71bv5kob0mioof8vVifkuaY`（crud-poc のコピー）。両方とも非共有。コピー元・先の`v2_posts!A1:F30`で見出しと既存6件が一致。日付列追加は公開@19更新後に実行し、changed=trueを確認。既存行を保持。
- 最終AI方式：OpenAI Responses API、gpt-4.1-mini、store:false。旧Gemini／OAuth検討は最終仕様ではない。

## 実GASの合格条件

| 教材 | 1回の体験で確かめる結果 |
|---|---|
| 評価 | メンバー追加→ドリンク2・ボトル1・売上12000円の実績保存→5.00 pt。月次表示とSheetsを照合。同じ人・同じ日の重複は拒否 |
| ショップ | 1200円商品1個＋600円商品1個→1800円・明細2件。再読込後も同じ注文。同ID再送で二重注文しない |
| 日記 | 架空画像を添付→実AI下書き→本人が手直し→日付・複数タグで保存→再読込。タグ2つのOR絞込み、改名後の関連保持、使用中削除拒否、未使用削除 |
| 英語 | 1問の英語回答→実AI採点→履歴、短い会話→終了→振り返り→再表示。AIオフ／未設定は説明して止める |
| じゃんけん | スキルを選ばず1対戦→勝敗と2点または1点→履歴。再読込・同ID再送で履歴と得点が増えない |

本人限定URLへ未ログイン状態でアクセスして利用できないことも確認する。完成教材の一般公開や、学習者による受講完了は今回の技術受入と別。

## 配置先（内部記録）

以下は本人限定デプロイの作成先。**初期設定・受入済みURLの一覧ではない。**

| 教材 | Sheets | GASエディタ | Webアプリ |
|---|---|---|---|
| 評価 | [専用Sheet](https://docs.google.com/spreadsheets/d/1wNLhMhwm2K3tuYbArNgL8KmScADeqgDvdZWzIMVoKbo/edit) | [エディタ](https://script.google.com/d/1gZP4gUV30CE9lPv9UBGOomvvOCiSOz8c8FmttrsTZIWbya_1c9Pv5OOb/edit) | [@1](https://script.google.com/macros/s/AKfycbzZcljLvmtFRzg21-M3EhdYKdB3aaPTcsREHkOeJ5ti5ViYGC-hlmwHFYdNdF6mNkg1zw/exec) |
| ショップ | [専用Sheet](https://docs.google.com/spreadsheets/d/1u1dyTNfoCNhRVApzcKa1VXwR-4lwpyU0-OdYYl4FG-0/edit) | [エディタ](https://script.google.com/d/1Awv1TIGua6VOkjfi7Nu3eS5YADf_9DKDza95FAcaUXhZcUZRC6Ze43h7/edit) | [@1](https://script.google.com/macros/s/AKfycbyCSfXMVL9QM9kLlBkBdm2szQ0ZiATprb6tTrngyBgG5WKgLOmepWviEZlXAW70cyGf/exec) |
| 英語 | [専用Sheet](https://docs.google.com/spreadsheets/d/1dM0iSIjpJqDEboxADXScSXnKxl4GI99peFK84kZpGH4/edit) | [エディタ](https://script.google.com/d/1EqndChD0fxe1pI0nTRImZCRVj8_6U0_AdDoh3Xwp_fzVt5fMSRwepddT/edit) | [@3](https://script.google.com/macros/s/AKfycbz5PHn6MnxHFxLfDAWDcyLeAXYwZFKlTCbgh1CSTCOhvK8__TI4lZouJUEbWBvI8XZ_/exec) |
| 通常じゃんけん | [専用Sheet](https://docs.google.com/spreadsheets/d/17ogJYHh3tYIAtVs_uNhB3txmGoBr58z-6F2d4oCQxfY/edit) | [エディタ](https://script.google.com/d/1qM9Eo5-TMQYo2WA-yMPFHhSKbtB8PVLEd_sDexrkcHv3ppynplwX_hOW/edit) | [@1](https://script.google.com/macros/s/AKfycbyY86SNo97TWFozh2tPLI-iN9vk_rJjJ5ZKEqjaVjePjeU4pCQ1wqd6RdnCsQq1vCUA6A/exec) |
| 日記 | 既存環境を維持 | `photo-diary/src/.clasp.json`で照合 | [@20](https://script.google.com/macros/s/AKfycbxheV06EzeMBitwdmIcYCjLAZXMuhxiF_dRc2N0XvcrKztDNwucPnnBZn0iM6ISf9SaKg/exec) |

接続設定は各`.clasp.json`（Git除外）。通常じゃんけんは`dist-basic`、評価・ショップは`src`、日記・英語は各`src/`直下をrootDirにする。旧じゃんけんの接続設定はローカル作業控えへ保存し、旧クラウドを上書きしていない。

## 今回直した問題と証拠

- 日記：単一タグ絞込みを複数ORへ、タグ管理を追加。120字／5000字／5タグ／3画像。旧6タグ以上の記録は削らず読取り可能。日付列追加は旧行を保持する回帰テストあり。
- 日記のスマホテスト：meta viewportが模擬HTMLに無く、390px指定でも980pxで描画していた。viewportを追加し、`innerWidth === 指定幅`も検証。メニューの重なりを直し、390pxのスクショを再確認。
- 英語：自由記述と自由会話を基本導線とし、能力一覧・候補承認・再学習リセットを基本画面から外した。旧履歴を読む内部機構は保持。GAS pushが拒否した論理代入`||=`を通常代入へ変更し、実push成功を確認。
- じゃんけん：旧スキル必須処理と独立した2表・9ファイルの通常版を作成。旧データやWebのスキルは削除しない。
- スクショ：評価・ショップ・じゃんけんは各`test-results/`、日記は`src/test-results/tags-{1440,390}.png`、英語は`src/test-results/trainer-{1440,390}.png`。いずれもローカル検証の証拠。

## 今回へ戻さない枝葉

評価の編集・在籍変更・配点変更UI、ショップの取消・商品管理、音声、決済、在庫、SNS、運用監査、独自認証、AI実課金台帳は今回追加しない。正式な次の依頼があれば、本人の1課題として別に扱う。

## 2026-10-28 OpenAI切替の追加証拠

- ローカル：英語76件、日記162件成功。PC1440／390pxのPlaywright操作成功。実キーのResponses APIはテキスト2ケース・画像1枚／2枚ともHTTP 200。最初の画像400は検証用PNG不正で、正常なPNGへ修正して再確認。
- 英語：`I hope the weather will get better tomorrow.` を入力し、意味・指定表現が一致する実AI採点理由を表示。会話では読書の好みを質問し、冒険・ファンタジーを好む旨のAI返答を表示。
- 日記：`6f2b82ae-8fac-45db-a504-132f53c3d088`「OpenAI受入確認：読書の休日」。架空の本・円の画像を添付しOpenAI下書き、本人の手直し、2026-10-28・休日／読書の2タグで保存。再読込後640px画像・本文を確認。
- 旧方式での受入記録 `525603f4-460c-4b97-80f2-001e25492c60` も保持。読書タグを一時改名して関連保持、使用中削除はin_use拒否、元の名前へ復元済み。
- キー登録時に伏せ処理の実行失敗を見落として後続を続け、ブラウザーツールがコード中のキーを再掲した。利用者へ報告し失効・再発行を依頼。応答の保存・表示を伏せ字化し一時要求を削除。再発防止は各OpenAI接続手順へ記録。キー値はこの文書・Gitへ含めない。

### 最終画面確認

- 日記：カフェ＋読書の2タグをUIから選択し、OR条件で5件表示。使用中タグの改名・削除拒否に加え、受入確認用の未使用タグを管理画面から削除し、一覧から消えたことを確認。
- 英語：読書について1往復し、終了後の日本語振り返りを確認。ページ再読込後も保持。学習記録に実AI採点済みの回答1件、終了した会話2件を表示。
- PC1440／スマホ390の実GAS画面を撮影・目視確認。日記画像・本文・2タグ、英語の会話と振り返りに横はみ出しなし。`diary-openai-{1440,390}.png`、`english-openai-{1440,390}.png`、`english-openai-390-result.png` を前述の作業用スクショ保存先へ保存。
- キー登録・不正値拒否・削除・秘密非返却の回帰試験を1件追加し成功（日記は既存162件＋追加1件）。公開後のコード変更はなく、追加は検証・文書のみ。
- **今回の写真日記／英語の機能・公開受入は完了。キー失効・再登録は利用者対応待ち。5教材全体のSheets直接照合などは上表に残しており、全作業ゼロとはしない。**
