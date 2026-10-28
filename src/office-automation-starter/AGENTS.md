# AGENTS.md

Cursor をはじめとする AI コーディングアシスタントが、本リポジトリで作業するときに従うべきルールを集約したファイル。Cursor は本ファイルおよび `.cursor/rules/*.mdc` を Chat / Composer のコンテキストとして自動参照する。

---

## 1. このリポジトリの位置づけ

非 IT エンジニア（**Windows ユーザー**）が **Cursor の Hobby 枠（無料プラン）だけ** を使って **事務処理を自動化** するための、プロンプトメモ + サンプルデータ + ガイドドキュメント一式。

中身は実コードではなく **「Cursor Chat に貼り付ける日本語プロンプトメモ + サンプルデータ + Cursor 利用ガイド」** の集合体。実装作業は基本的にユーザーが Cursor の Chat (Ctrl+L) にプロンプトメモを貼って都度依頼する流れで発生する。

主想定読者は **AI・ML・ビッグデータ人材を扱う IT 人材派遣（SES）の営業担当者**（非エンジニア・IDE 初体験を含む）。**対象 OS は Windows 10/11 のみ**。

---

## 2. ディレクトリ構成（実体）

- `README.md` — 入口（最小、機能概要のみ）
- `AGENTS.md` — 本ファイル
- `.cursor/rules/repo.mdc` — Cursor 用プロジェクトルール（Chat / Composer のコンテキストに自動付与）
- `docs/教育資料/00_導入スライド.md` — 導入（概念図 / なぜ AI 業務効率化か / なぜ Cursor か / 得られるリターン / 学習ロードマップ / 用語）
- `docs/教育資料/01_クイックスタート.md` — **15 分で Cursor を動かす最短チェックリスト**
- `docs/教育資料/02_環境構築ガイド.md` — Phase 1：Cursor 導入 + サインインの詳細手順書
- `docs/教育資料/03_ハンズオン.md` — Phase 2：ZIP ダウンロード → Open Folder → Chat 投入の詳細版
- `docs/教育資料/04_Cursor操作.md` — 操作リファレンス（Hobby 枠 + Chat / Inline / Tab / `@file`）& 統合トラブルシューティング
- `docs/教育資料/90_動画スライド.md` — 動画化用 Marp スライド（02/03 のスクショ＋ナレーション・スライドショー型。別レイヤー）
- `docs/教育資料/91_動画化メモ.md` — 動画化メモ（書き出し手順・公開前チェック＝個人情報マスク等。別レイヤー）
- `docs/01_仕様と設計.md` 〜 `05_運用.md` — 仕様 / backlog / 実体目録 / 動作確認 / 利用者フロー。権威順位と更新ルールは `docs/README.md` 参照
- `src/office-task/` — 事務処理タスクのプロンプトメモ + サンプルデータ（`README.md` にプロンプトを保管）

> **注意**: 本リポジトリにセットアップシェルやプログラミング学習タスクは存在しない（**ランタイム非インストール + 事務処理特化** の方針）。

---

## 3. ランタイム非インストール原則（最重要）

本キットでは **Python / Node.js / Docker などのプログラミングランタイムをインストールしない**。Cursor Chat / Composer / Inline Edit に対しては以下を守る:

- ランタイム導入（`apt install python3` / `pip install ...` / `npm install ...` 等）を伴う解を **提案しない**
- **Windows 標準機能で完結する解** を優先する:
  - PowerShell（Windows に最初から入っているスクリプト言語）
  - Excel の数式・Power Query・ピボットテーブル
  - エクスプローラの手動操作
  - Edge / Acrobat の標準コピー機能
  - Windows 11 標準の OCR（PowerToys Text Extractor）
- もしくは **Cursor 内で完結する処理** を案内する:
  - Cursor が読めるファイル（テキスト / CSV / Markdown）は Chat に添付（`@file`）して AI 側で処理
  - PDF の中身は Edge で開いて全選択コピー → Chat に貼り付け
- どうしてもランタイムが必要な場合は、まず代替案（PowerShell / Excel / Cursor 内処理）を提示し、ユーザーが明示的に承諾した場合のみインストール手順を案内する

---

## 4. プロンプトメモ（`src/office-task/README.md`）の編集ルール

利用者がそのままコピペして Cursor Chat に渡す前提のドキュメント。以下の規約を守る:

- **共通項目を上部に集約して DRY 化しない**。各プロンプトセクションは自己完結（同じ要件を重複して書く）させる
- フォーマットは `## プロンプトN: <概要>` 見出し + `- **項目名**: 内容` 箇条書き
- ファイル操作を扱う場合、**元ファイルは絶対に変更・移動・削除しない**。コピーして新しい名前を付けて同ディレクトリに保存する方式が既定
- 各プロンプトは **ランタイム非インストール原則（§3）** に従い、PowerShell / Excel / Cursor 内処理のいずれかで完結する形に書く
- 回答は日本語、必要に応じて操作手順も日本語で案内

---

## 5. Cursor 利用時のルール

- **Hobby 枠の制約を意識する**: Slow request の月次上限と利用可能モデルの制限がある（具体的な数値は `docs/教育資料/04_Cursor操作.md` 参照）。1 リクエストに長文・多並列を詰め込まず、小さく分割する
- **Chat (Ctrl+L) が基本**。ピンポイント編集は **Inline Edit (Ctrl+K)**。**Composer / Background Agent / MCP / スキル等の高度機能は本キットでは使わない**（非エンジニア・IDE 初体験向けの方針。詳細は `docs/教育資料/04_Cursor操作.md §3`）
- リポジトリ内のファイルを参照させたいときは `@file` / `@folder` を使う（`@docs` / `@web` / `@git` は事務処理では使わない）
- 本ファイル (`AGENTS.md`) と `.cursor/rules/repo.mdc` は Cursor が自動的にコンテキストに加えるため、ユーザーが明示的に貼る必要はない

---

## 6. 作業時の言語・スタイル

- ドキュメント・回答・コミットメッセージは **日本語**（本リポジトリの読者は日本語話者の非エンジニア）
- 既存ドキュメントが日本語見出し / 日本語コメントを使っている箇所は同じスタイルを維持する
- 英単語の用語はそのまま OK（例: `Cursor`, `PowerShell`, `Excel`）

# 7. 日本語フォントの徹底（PDF / 画像 / ドキュメント生成時）

PDF・画像・スライド等を生成する場合は **必ず日本語フォントを明示指定** する。汎用 CJK フォント・中国語向けフォントの自動選択を避ける。Unicode の同一コードポイントでも日本語と中国語で **字形が異なる漢字**（例: 直, 骨, 国, 海, 別 など）が多く、日本語向け文書に中国語字形が混入すると違和感や誤解を招くため。

**推奨フォント（日本語）**:

- `IPAGothic` / `IPAPGothic`（`/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf` / `ipagp.ttf`）— Linux 環境ではこれを既定で使う
- `IPAMincho` / `IPAPMincho`（明朝が必要なとき）
- `Noto Sans CJK JP` / `Noto Serif CJK JP`（Noto を使う場合は **JP サフィックス必須**。`Noto Sans CJK SC` / `TC` / `KR` は使わない）
- Windows 環境: `Yu Gothic` / `Meiryo` / `MS Gothic`

**使ってはいけないフォント**（中国語字形を含む / 言語非特定の汎用 CJK）:

- `WenQuanYi Zen Hei` / 文泉驛・文泉驿（中国語字形）
- `Source Han Sans SC` / `Source Han Sans TC` / `Source Han Sans HK` / `Source Han Sans KR`（SC = 簡体字 / TC = 繁体字 / HK = 香港 / KR = 韓国）
- `Noto Sans CJK SC` / `Noto Sans CJK TC` / `Noto Sans CJK HK` / `Noto Sans CJK KR`
- フォント名末尾に `SC` / `TC` / `HK` / `KR` が付くもの全般
- 言語サフィックスなしの `Noto Sans CJK` だけの指定（自動でどれかにフォールバックされる）

**コード生成時の遵守事項**:

- `reportlab` の `TTFont` / `matplotlib` の `font.family` / Pillow の `ImageFont.truetype` 等で **フォントパス or 名前を明示** する。デフォルトに任せない
- フォントが見つからないときは中国語フォントに **暗黙にフォールバックさせず**、エラーで止めるか、利用者に確認する
- 例: `pdfmetrics.registerFont(TTFont("IPA", "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"))` のように **パス指定**で読み込む

**生成後の検証**:

- 主要漢字（例: 「直」「骨」「国」「別」「海」「角」）が日本語字形になっているか目視確認
- ファイル内のフォント情報を確認（`pdffonts <file>.pdf` 等）。中国語フォント名が混ざっていないか確認
