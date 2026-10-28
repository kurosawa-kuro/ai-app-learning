# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## このリポジトリの正体

**実コードは無い**。中身は「Cursor Chat に貼り付ける日本語プロンプトメモ + サンプルデータ + Cursor 利用ガイド」の集合体。非 IT エンジニア（Windows ユーザー）— 主に **AI・ML・ビッグデータ人材を扱う IT 人材派遣（SES）の営業担当者** — が **Cursor の Hobby 枠（無料プラン）だけ** で営業事務の定型業務を自動化するためのスターターキット。教材の取得は git ではなく **GitHub の ZIP ダウンロード→展開** で行う（非エンジニア・IDE 初体験前提）。

そのため **build / lint / test コマンドは存在しない**。`package.json` / `pyproject.toml` / `Makefile` も無い。作業はほぼ全て Markdown ドキュメントとサンプルデータの編集。

成果物の検証は「Cursor で実際にプロンプトを投入して期待通り動くか」を人手で確認する（手順は `docs/04_検証.md`）。推測でドキュメントを書かず、書いたら Cursor で確認する。

## 編集時に必ず守る設計制約

これらは AGENTS.md / `.cursor/rules/repo.mdc` の要約。詳細・理由はそちらを参照。

1. **ランタイム非インストール原則（最重要）** — `pip install` / `npm install` / `apt install` / venv 作成 等を **伴う解を提案しない**。代わりに Windows 標準機能（PowerShell の `Copy-Item`/`Rename-Item`、Excel の数式・Power Query・ピボット、エクスプローラ、Edge/Acrobat のコピー、PowerToys Text Extractor の OCR）か、Cursor 内のファイル読み書き（`@file`/`@folder`）で完結させる。どうしても必要なときだけ代替案を先に出し、ユーザーの明示承諾後にインストール手順を案内。

2. **対象 OS は Windows 10/11 のみ** — macOS / Linux 手順は案内しない。コマンド例は PowerShell / cmd / Cursor 内操作に絞る。

3. **元ファイル不変更** — `src/office-task/data/` のサンプルや利用者の業務ファイルは**変更・移動・削除しない**。コピーして新しい名前で同ディレクトリに保存（`Copy-Item`、`Move-Item` 不可）。

4. **プロンプトメモは自己完結（DRY 化しない）** — `src/office-task/README.md` の各プロンプトは、共通項目を上部に集約せず、セクション単体でコピペできる状態を維持する（重複は意図的）。フォーマットは `## プロンプトN: <概要>` 見出し + `- **項目名**: 内容` 箇条書き。

5. **日本語が canonical** — ドキュメント・回答・コミットメッセージは日本語。英単語の用語（Cursor / PowerShell / Excel）はそのまま可。

6. **PDF / 画像 / スライド生成時は日本語フォントをパスで明示指定** — 中国語字形フォント（`Noto Sans CJK SC|TC|HK|KR`、`Source Han Sans SC|TC|...`、`WenQuanYi`、言語サフィックス無しの汎用 CJK）を使わない。Linux では `IPAGothic`（`/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf`）を既定に。フォント未検出時は中国語フォントへ暗黙フォールバックさせずエラーで止める。理由は「直/骨/国/別/海」等が日中で字形が異なるため。

## サンプルデータの意図的な設計

`src/office-task/data/` のファイル名はわざと Windows デフォルトの曖昧名（`新規 データ1.csv` 等）。**プロンプト5（中身を読んで適切な名前にリネーム）の演習を成立させるための意図的設計**。良かれと思って改名・整理しない。

- `新規 データ1.csv` = 稼働中エンジニア10名 / `新規 データ2.csv` = 募集中案件10件
- `新規 テキスト ドキュメント1.txt` = SES 業務委託基本契約 / `...2.txt` = スキルシート（山田太郎・仮名）
- `見積書/見積書_{A,B,C}社.pdf` = 同一案件への3社見積（PDF はベンダー名がファイル名なので曖昧化していない）

## ドキュメントの権威順位と連動更新

矛盾したときの勝者: `docs/01_仕様と設計.md` > `docs/03_実装カタログ.md` > `README.md`。`AGENTS.md` は作業ガイドであり仕様の権威ではない（仕様変更は `01` を直してから反映）。

連動更新（同一コミットで直す。drift 防止。詳細は `docs/README.md §3`）:
- `src/office-task/README.md` のプロンプト増減 → `docs/03_実装カタログ.md`（必要なら `docs/05_運用.md`）
- `src/office-task/data/` の増減 → `docs/03_実装カタログ.md`
- 設計方針の変更 → `docs/01_仕様と設計.md` + `AGENTS.md` + `src/office-task/README.md`
- Cursor UI / Hobby 枠仕様の変更 → `docs/教育資料/04_Cursor操作.md` + `01_クイックスタート.md`

`docs/教育資料/` は利用者向け線形学習パス（00 導入 → 01 クイックスタート → 02 環境構築 → 03 ハンズオン → 04 操作リファレンス）。`90_動画スライド.md` / `91_動画化メモ.md` は動画化用の別レイヤー。

## 参照ファイル

- `AGENTS.md` — AI アシスタント向け作業ガイドの完全版（本ファイルの制約の出典）
- `.cursor/rules/repo.mdc` — Cursor が自動付与するプロジェクトルール（AGENTS.md と同趣旨）
- `docs/README.md` — ドキュメント運用ルール・権威順位・連動更新表
- `src/office-task/README.md` — 事務処理プロンプトメモ8本（Tier T1〜T5 の難易度マップ付き）
