# 事務処理タスク プロンプトメモ（IT エンジニア派遣・SES 営業向け）

> **想定読者**: IT エンジニア派遣（SES）の営業担当者。エンジニアのアサイン、案件マッチング、協力会社見積もり比較、提案資料作成などの定型事務を Cursor で効率化したい。
>
> **前提**: 本キットは Cursor の Hobby 枠（無料プラン）+ Windows 10/11 + ランタイム非インストール（Python / Node.js を入れない）で完結する設計です。各プロンプトを Cursor の Chat (Ctrl+L) または Inline Edit (Ctrl+K) にコピペして使ってください。
>
> **AI への期待動作**: AI には **Windows 標準機能（PowerShell / Excel / エクスプローラ / Edge）または Cursor 内のファイル読み書きだけで完結する解** を依頼します。Python / Node.js のインストールを伴う解（`pip install ...` 等）が返ってきたら、「ランタイム非インストール原則に従って再回答してください」と追記して再依頼してください。
>
> **サンプルデータ** (`src/office-task/data/`):
>
> ⚠️ ファイル名は **わざと Windows デフォルトの曖昧名**（`新規 データ1.csv` 等）にしてあります。**プロンプト5（リネーム）の課題が成立するための意図的な設計** です。中身を読んで適切な名前を付ける、というのが演習の主旨です。
>
> | ファイル名（曖昧） | 中身 |
> |---|---|
> | `新規 データ1.csv` | 自社・協力会社の稼働中エンジニア 10 名（スキル / 単金 / 稼働開始可能日 / リモート可否 ほか） |
> | `新規 データ2.csv` | クライアントから来ている募集中案件 10 件（必須スキル / 単金レンジ / 開始日 / 期間 ほか） |
> | `新規 テキスト ドキュメント1.txt` | SES 業務委託基本契約のサンプル（章立て構造） |
> | `新規 テキスト ドキュメント2.txt` | 山田太郎（仮名・経験9年 Java バックエンド）のスキルシート（自由文） |
> | `見積書/見積書_A社.pdf` `見積書_B社.pdf` `見積書_C社.pdf` | 協力会社 3 社からの架空見積書 PDF。同一案件「Java バックエンドエンジニア 1 名 6 ヶ月」を、単金・契約条件を変えて 3 社が提案している（PDF はベンダー名がファイル名なので、こちらは曖昧化していません） |
>
> 各プロンプトは **コピペで Chat に渡せる自己完結型** です。共通項目はあえて DRY 化していません。
>
> ## 難易度マップ（上から順に進めると無理なくステップアップできます）
>
> | プロンプト | Tier | 必要なもの |
> |---|---|---|
> | 1. 商談後のお礼・提案メール文面生成 | **T1: Chat 単体・入力データ不要** | Cursor Chat だけ |
> | 2. 商談議事録テンプレ生成 | **T1** | Cursor Chat だけ |
> | 3. スキルシート・契約書の構造化・要約 | **T2: Chat が TXT を読む** | Chat + `@file` |
> | 4. エンジニア一覧 / 案件一覧の集計レポート | **T2** | Chat + `@file`（小さな CSV を直接読ませる） |
> | 5. ファイル名リネーム（スキルシート整理） | **T3: PowerShell スクリプトを Chat が生成 → 手元で実行** | Chat + PowerShell |
> | 6. ファイル整理（拡張子別フォルダにコピー） | **T3** | Chat + PowerShell |
> | 7. エンジニア × 案件マッチング（CSV 結合） | **T4: Excel Power Query / 数式** | Chat + Excel |
> | 8. 協力会社見積書 PDF → 比較用 CSV | **T5: PDF 抽出 + Chat + CSV 集計の複合フロー** | Edge コピペ / PowerToys + Chat + (任意) Word COM PowerShell |

---

## プロンプト1: 商談後のお礼・提案メール文面生成

- **Tier**: T1（Chat 単体・入力データ不要）
- **依頼内容**: 以下の情報をもとに、IT 派遣営業のシーンに沿った敬語のメール本文（件名＋本文＋署名欄）を作成
- **想定シーン**: 初回商談後のお礼 / エンジニア提案 / 単金交渉の打診 / 契約更新案内 など
- **入力情報の例**（`新規 テキスト ドキュメント2.txt` の中身（山田太郎のスキルシート）を流用して試せます）:
  - 宛先（クライアントの担当者名・役職、または社内人事の役職）
  - 件名の概要（例: 「Java バックエンドエンジニアのご提案」「初回商談のお礼」）
  - 伝えたい要件のメモ書き（候補エンジニア名・スキル要約・希望単金・最短稼働日 など）
- **出力形式**:
  - **件名**: メール件名
  - **本文**:
    - 宛名
    - 時候の挨拶（季節に応じて、または無季節版）
    - 本文（要件）
    - 結びの一言
    - 署名欄（[氏名] / [所属（営業）] / [メール] / [TEL] のテンプレ）
- **注意**: 過剰な敬語にならない自然な表現で。必要に応じて 1〜2 案提示
- **ランタイム不要**: 純粋なテキスト生成タスク。Cursor Chat 内で完結
- **回答**: 日本語で、日本人にわかりやすい説明

---

## プロンプト2: 商談議事録テンプレ生成

- **Tier**: T1（Chat 単体・入力データ不要）
- **依頼内容**: 以下の情報から Markdown 形式の商談議事録ファイルを作成
- **想定シーン**: クライアントとの商談、協力会社との単金交渉、エンジニア面談 後の記録
- **入力情報**:
  - 商談タイトル（例: 「○○社 Java エンジニア案件 初回商談」）
  - 日時（YYYY-MM-DD HH:MM）
  - 場所（オンライン / オフィス）
  - 参加者（自社・クライアント・協力会社、それぞれ役職含めて）
  - 主な議論項目（必須スキル / 単金レンジ / 開始希望時期 / 商流 / 商談ステータス など）
- **出力フォーマット**:
  ```markdown
  # 商談議事録: <案件名・商談タイトル>

  ## 日時
  ## 場所
  ## 参加者
  ## アジェンダ
  ## 案件サマリ（クライアント / 業界 / 役割 / 必須スキル / 単金レンジ / 期間 / 勤務形態）
  ## 議論内容
  ## 決定事項
  ## アクションアイテム（担当 / 期限）
  ## 次回予定
  ```
- **保存先**: 本リポジトリの `src/office-task/data` に `<YYYY-MM-DD>_<案件名>_商談議事録.md` として **Cursor のエディタで新規作成・保存** する
- **ランタイム不要**: 純粋なテキスト生成タスク。Cursor Chat 内で完結
- **回答**: 日本語で、日本人にわかりやすい説明

---

## プロンプト3: スキルシート・契約書の構造化・要約

- **Tier**: T2（Chat が TXT を読む）
- **依頼内容**: `src/office-task/data/` 配下のテキストファイル（**ファイル名は曖昧なので、まず `@file` で中身を読んでから判別**）を、用途別に整形
  - `新規 テキスト ドキュメント1.txt`（中身: SES 業務委託基本契約書）→ **章立てを正しく階層化した Markdown** に整形（`# / ## / ###` を使う）+ 主要条項（対価・期間・秘密保持・反社条項 など）の要点を冒頭にサマリ
  - `新規 テキスト ドキュメント2.txt`（中身: 山田太郎のスキルシート）→ **クライアント提案用の「項目 / 内容」2 列 Markdown 表** に整形（氏名 / 経験年数 / 主力スキル / 副次スキル / 直近案件 / 希望単金 / 最短稼働日 / 勤務形態 / 英語 / 資格 など）
- **制約**: 元ファイルは絶対に変更・移動・削除しない。整形結果は新しい `.md` として同フォルダに保存
- **対象フォルダ**: 本リポジトリの `src/office-task/data`（`@folder` で添付してください）
- **実現手段**: Cursor Chat 内のテキスト処理だけで完結する。AI が `@file` で対象ファイルを読み込み、整形結果を Markdown で出力 → Cursor のエディタで新規ファイルとして保存
- **保存先**:
  - 契約書: `src/office-task/data/業務委託基本契約書_整形.md`
  - スキルシート: `src/office-task/data/スキルシート_山田太郎_提案用.md`
- **ランタイム不要**: 純粋なテキスト整形タスク。Cursor Chat 内で完結
- **回答**: 日本語で、日本人にわかりやすい説明

> 💡 補足: PDF のスキルシートからテキストを取り出したい場合は、PDF を Microsoft Edge または Acrobat Reader で開いて全選択コピー（`Ctrl+A` → `Ctrl+C`）→ Cursor Chat に貼り付けて、本プロンプトと同じ要領で整形依頼してください。画像化された PDF は Windows 11 標準の **PowerToys Text Extractor** で OCR してください。

---

## プロンプト4: エンジニア一覧 / 案件一覧の集計レポート

- **Tier**: T2（Chat が CSV を読む）
- **依頼内容**: `src/office-task/data/新規 データ1.csv`（中身: エンジニア一覧）と `新規 データ2.csv`（中身: 案件一覧）から、営業会議で使える集計レポートを Markdown で生成
- **集計内容**:
  - エンジニア一覧 (`新規 データ1.csv`):
    - レコード件数、稼働中 / 待機中の人数
    - 主力スキル別の人数（Java / React / Python / Go / Salesforce など）
    - 単金（`monthly_rate`）の平均 / 中央値 / 最大 / 最小
    - リモート可否の分布
    - 直近稼働終了予定（`available_from` 別）の一覧
  - 案件一覧 (`新規 データ2.csv`):
    - レコード件数、ステータス別の件数
    - 業界別の件数
    - 必須スキル（`must_skills`）の頻度ランキング上位 5
    - 単金レンジの中央値（`monthly_rate_min`〜`monthly_rate_max`）
    - 募集締切（`deadline`）が近い順 Top 5
- **制約**: 元 CSV は絶対に変更・移動・削除しない
- **対象**: `@file src/office-task/data/新規 データ1.csv` と `@file src/office-task/data/新規 データ2.csv` で 2 つの CSV を添付
- **実現手段**: 各 CSV は 10 行と小さいので、Cursor Chat に `@file` で添付し、AI が直接読んで Markdown 集計を生成（Python / pandas は使わない）
- **出力先**: Cursor のエディタで `src/office-task/data/週次営業レポート_<日付>.md` を新規作成して保存
- **ランタイム不要**: Python / pandas は使わない
- **回答**: 日本語で、日本人にわかりやすい説明

> 💡 補足: 件数が増えた場合は、Excel の **ピボットテーブル** または **Power Query** での集計手順を AI に案内させてください。

---

## プロンプト5: ファイル名リネーム（曖昧名ファイルを内容に合った名前に）

- **Tier**: T3（PowerShell スクリプトを Chat が生成 → 手元で実行）
- **依頼内容**: 以下のフォルダ配下の **「新規 データ1.csv」「新規 テキスト ドキュメント1.txt」のような Windows デフォルトの曖昧なファイル名**（CSV 2 本 + TXT 2 本）を、中身に基づいた **意味のある日本語ファイル名** にリネーム
  - 例: `新規 データ1.csv`（中身が稼働中エンジニア一覧と判明）→ `エンジニア一覧_稼働中_2026-05.csv`
  - 例: `新規 テキスト ドキュメント2.txt`（中身が山田太郎のスキルシートと判明）→ `スキルシート_山田太郎_Java_2026Q2.txt`
- **制約**: 元ファイルは絶対に変更・移動・削除しない。コピーして新しい名前を付けたものを同じディレクトリに保存する
- **対象フォルダ**: 本リポジトリの `src/office-task/data`（`@folder` で添付してください）
- **実現手段**: AI には以下の 2 つを提示してもらう
  1. 各ファイルへの新ファイル名案を「現ファイル名 / 中身の要約 / 新ファイル名」の 3 列 Markdown 表で
  2. PowerShell の `Copy-Item` ワンライナー（新しい名前で同フォルダに保存する形）
- **ランタイム不要**: Python / Node.js のインストールは不要。PowerShell は Windows 標準
- **回答**: 日本語で、日本人にわかりやすい説明

---

## プロンプト6: ファイル整理（拡張子別フォルダにコピー）

- **Tier**: T3（PowerShell スクリプトを Chat が生成 → 手元で実行）
- **依頼内容**: `src/office-task/data/` 配下の 4 ファイル（CSV 2 / TXT 2）を、**拡張子別のサブフォルダにコピー** する PowerShell スクリプトを作成
- **制約**: 元ファイルは絶対に変更・移動・削除しない。**コピーで** サブフォルダに配置する（`Copy-Item` を使う、`Move-Item` は不可）
- **対象フォルダ**: 本リポジトリの `src/office-task/data`（`@folder` で添付してください）
- **動作**: スクリプトを PowerShell で実行すると、以下のサブフォルダが自動作成され、対応する拡張子のファイルがコピーされる
  - `data/_整理/csv/` ← `新規 データ1.csv` / `新規 データ2.csv`
  - `data/_整理/txt/` ← `新規 テキスト ドキュメント1.txt` / `新規 テキスト ドキュメント2.txt`
- **拡張版（任意）**: 「拡張子別」と「更新日付別（年月単位、`data/_整理/2026-05/` など）」をユーザーが選べる引数を追加してもよい
- **ランタイム不要**: PowerShell は Windows 標準。Python は使わない
- **回答**: 日本語で、日本人にわかりやすい説明 + PowerShell の実行手順（PowerShell ターミナルに貼り付けて Enter / `powershell.exe -File <script>.ps1` のいずれか）

---

## プロンプト7: エンジニア × 案件マッチング（CSV 結合）

- **Tier**: T4（Excel Power Query / 数式）
- **依頼内容**: `src/office-task/data/新規 データ1.csv`（中身: エンジニア一覧）と `新規 データ2.csv`（中身: 案件一覧）を結合し、**エンジニア × 募集案件のマッチング表** を Excel 上で作る手順を案内
- **想定シーン**: 営業ミーティングで「待機中エンジニア × 適合度の高い案件」を毎週洗い出したい
- **マッチング条件の例**:
  - **スキル一致**: エンジニアの `primary_skill` または `secondary_skills` が案件の `must_skills` を満たす
  - **単金レンジ**: エンジニアの `monthly_rate` が案件の `monthly_rate_min` 〜 `monthly_rate_max` の範囲内
  - **稼働開始日**: エンジニアの `available_from` ≤ 案件の `start_date`
  - **勤務形態**: エンジニアの `remote_pref` と案件の `remote_type` が両立する
- **制約**: 元の CSV は絶対に変更・移動・削除しない。結合結果は新しいファイルとして保存
- **対象フォルダ**: 本リポジトリの `src/office-task/data`（`@folder` で添付してください）
- **実現手段**: AI には以下のいずれかを提示してもらう（Python は使わない）
  - **Excel の Power Query**: 「データ」タブ →「データの取得」→「ファイルから」→「テキスト/CSV」→ 文字コード `UTF-8`、区切り `カンマ` で両ファイルを読み込み → クエリのマージ（フル結合）→ カスタム列で適合度スコアを計算 →「閉じて読み込む」までの手順
  - **Excel 数式**: 新しい Excel が使える場合は `XLOOKUP` / `FILTER` / `LET` / `BYROW` で「エンジニア1名に対し条件を満たす案件を全部並べる」数式例
- **出力**: 同フォルダに `マッチング結果_<日付>.xlsx` として手動保存する手順を含める
- **ランタイム不要**: Python / pandas / openpyxl は使わない
- **回答**: 日本語で、日本人にわかりやすい説明

---

## プロンプト8: 協力会社見積書 PDF → 比較用 CSV（複数ベンダー）【上級者向け・任意】

- **Tier**: T5（PDF 抽出 + Chat + CSV 集計の複合フロー）
- **依頼内容**: `src/office-task/data/見積書/` 配下の **協力会社からの見積書 PDF** から、所定の列を抽出して 1 つの CSV に集約 → 単金・条件をベンダー間で比較しやすくする
- **想定ユースケース**: クライアント案件 1 件に対し、自社で人が足りないとき複数の協力会社から見積もりを取り、最安・最適なベンダーを選ぶ
- **制約**: 元 PDF は絶対に変更・移動・削除しない。集計 CSV は新規作成
- **対象フォルダ**: `src/office-task/data/見積書/`（**架空のサンプル PDF が 3 社分同梱されています**: `見積書_A社.pdf`（750,000円・週3リモート）/ `見積書_B社.pdf`（820,000円・フルリモート・英語可）/ `見積書_C社.pdf`（680,000円・出社必須）。同一案件「Java バックエンドエンジニア 1 名 6 ヶ月」を 3 社が提案している想定）
- **抽出列**（CSV のヘッダ）:
  - `vendor` — 協力会社名
  - `subject` — 件名 / 案件名
  - `role` — 役割（シニア / テックリード / ミドル など）
  - `monthly_rate` — 月単金（円、半角整数、税抜き）
  - `duration_months` — 契約期間（月数）
  - `subtotal` — 小計（税抜き、円、半角整数）
  - `tax` — 消費税額（円、半角整数）
  - `total` — 税込合計（円、半角整数）
  - `quote_date` — 見積日（YYYY-MM-DD）
  - `valid_until` — 有効期限（YYYY-MM-DD）
  - `remote_policy` — 勤務形態（フルリモート / 週3リモート可 / 出社必須 など）
  - `payment_terms` — 支払条件
  - `notes` — その他特記事項（英語可 / 資格 / 引き継ぎドキュメント など）
  - `source_file` — 元 PDF のファイル名

### ステップ A: PDF → テキスト化（PDF ごとに 1 回だけ）

PDF の種類によって手段を選ぶ:

| PDF の種類 | 手段 |
|---|---|
| テキスト PDF（コピペできるもの） | **Microsoft Edge / Acrobat Reader** で開く → `Ctrl+A` → `Ctrl+C` |
| 画像化 PDF（スキャン PDF など） | **Windows 11 標準の PowerToys Text Extractor**（`Win+Shift+T`）で OCR |
| Office 環境がある + 一括処理したい | 任意: 下記「Word COM の PowerShell 一括変換（任意）」を使う |

### ステップ B: Cursor Chat で 1 PDF = 1 行 CSV を生成

Cursor Chat (Ctrl+L) に貼り付けるプロンプト雛形:

```
以下は協力会社からの SES エンジニア派遣の見積書テキストです。次の列を CSV 1 行（ヘッダ無し、カンマ区切り、文字列はダブルクォートで囲む）で抽出してください。
列: vendor,subject,role,monthly_rate,duration_months,subtotal,tax,total,quote_date,valid_until,remote_policy,payment_terms,notes,source_file
- 数値（monthly_rate/subtotal/tax/total）は半角整数、円記号やカンマは付けない
- 日付は YYYY-MM-DD 形式
- duration_months は整数（例: 6）
- remote_policy は「フルリモート」「週Nリモート可」「出社必須」のいずれか
- notes は「英語可」「資格保有」「引き継ぎ込み」等の特記をパイプ `|` で区切る
- source_file は <ここに PDF のファイル名を書く>
- 抽出できない列は空文字
- CSV の前後に説明文を付けず、CSV 行 1 本だけ出力

---ここに PDF からコピーしたテキストを貼る---
```

### ステップ C: 集計 CSV にまとめる

1. Cursor のエディタで `src/office-task/data/見積書/比較_<日付>.csv` を新規作成
2. 1 行目にヘッダを書く:
   ```csv
   vendor,subject,role,monthly_rate,duration_months,subtotal,tax,total,quote_date,valid_until,remote_policy,payment_terms,notes,source_file
   ```
3. ステップ B で得た CSV 行を **PDF の枚数分だけ** 下に追記（各行 1 PDF）

### ステップ D: 集計・比較

Cursor Chat に `@file src/office-task/data/見積書/比較_<日付>.csv` を添付して、たとえば:

```
このベンダー比較 CSV について、税込合計（total）の昇順で並べた Markdown 表を作成し、最安値・最高値・平均値、有効期限が直近のベンダー、フルリモート対応ベンダー、英語対応可ベンダーを併記してください。
```

Excel で開くなら、ピボットテーブルや並べ替え機能でも OK。

### 任意: Word COM の PowerShell 一括変換（Office 環境がある場合）

数十枚の PDF がある場合、Edge コピペは現実的でない。Word が PDF を開けることを利用して、PowerShell から一括 `.txt` 化できる:

```powershell
# data/見積書/*.pdf を data/見積書/_txt/*.txt に一括変換（Word が必要）
$srcDir = "C:\path\to\office-automation-starter\src\office-task\data\見積書"
$dstDir = Join-Path $srcDir "_txt"
New-Item -ItemType Directory -Path $dstDir -Force | Out-Null

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    Get-ChildItem -Path $srcDir -Filter *.pdf | ForEach-Object {
        $doc = $word.Documents.Open($_.FullName, $false, $true)  # ConfirmConversions=false, ReadOnly=true
        $outPath = Join-Path $dstDir ($_.BaseName + ".txt")
        $doc.SaveAs2($outPath, 7)  # 7 = wdFormatUnicodeText
        $doc.Close($false)
        Write-Host "OK: $($_.Name) -> $($outPath)"
    }
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
```

- Cursor の Chat に「上記の PowerShell を私の環境に合わせて出力してください（パス: ...）」と頼めば書き直してくれる
- **Word が入っていない場合は使えません**（その場合は Edge コピペ方式に戻る）
- 画像化 PDF は Word でもテキストにならない（OCR が必要）

### ランタイム不要

Python / Node.js / 専用ライブラリ（pdfminer / pypdf）は **使いません**。すべて Cursor + Windows 標準機能（Edge / PowerToys Text Extractor / PowerShell）+ 任意で Word（Office）で完結します。

### 回答

日本語で、日本人にわかりやすい説明。
