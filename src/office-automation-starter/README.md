# AI で事務処理を効率化する

> 2026-10-28 方針更新：この教材の業務自動化についての質問・作業依頼はCursorで行う。別のアプリ教材におけるコード質問・改造はDevin、プログラムからのAI呼び出しはOpenAI APIで扱い、Geminiは教材アプリの接続先として廃止する。本キットの利用だけを理由にDevinやOpenAI APIの契約を一律に求めない。 判断の正本は[AIの役割分担（ADR 0003）](../../docs/adr/0003-ai-service-roles.md)。

**対象 OS: Windows 10/11 のみ ／ ランタイム不要（Python・Node.js のインストールなし）**

Windows ユーザー（特に非 IT エンジニア）が **Cursor の Hobby 枠（無料プラン）だけ** で **事務処理を自動化** するための、Cursor 利用ガイド + プロンプトメモ + サンプルデータの一式。

---

## できるようになること

本キットは **AI・ML・ビッグデータ人材を扱う IT 人材派遣（SES）の営業担当者**（非エンジニア・IDE 初体験を含む）を主な想定読者にしています。例:

| 業務シーン | 自動化できる例 |
|---|---|
| 顧客対応 | 商談後のお礼・提案メール文面生成、商談議事録テンプレ生成 |
| エンジニア・案件管理 | エンジニア一覧 / 案件一覧の集計レポート、エンジニア × 案件マッチング（CSV 結合） |
| 提案資料作成 | スキルシート・契約書の構造化・要約 |
| ベンダー比較 | 協力会社見積書 PDF → 比較用 CSV（複数ベンダー） |
| ファイル整理 | ファイル名リネーム（スキルシート整理）、拡張子別フォルダにコピー |

「コードが書けなくても、日本語で Cursor Chat に指示すれば動く」を目指している。

> 🎬 **動画で見る** → [AI で事務処理を効率化する（YouTube）](https://youtu.be/PhvT56ieCZg)

---

## はじめかた

このリポジトリに同梱された教材は `src/office-automation-starter/` をCursorで開きます。以下の単体配布元からZIPを取得した場合は、配布元の名前である `cursor-office-automation-starter-master/` を開きます。ローカルのフォルダー改名は、外部GitHubリポジトリの名前やURLの変更を意味しません。

> 🚀 **最短で動かしたい方は** → **[`01_クイックスタート.md`](./docs/教育資料/01_クイックスタート.md)（15 分版）**

3 ステップで動く:

1. **Cursor をインストール** — [cursor.com](https://cursor.com/) から Windows 版（`.exe`）をダウンロードして実行し、サインインする（Hobby 枠 = 無料アカウントで OK）
2. **教材を Cursor で開く** — GitHub の `Code → Download ZIP` で落として展開し、`File → Open Folder` から `cursor-office-automation-starter-master/` を開く（git は不要）
3. **プロンプトを Cursor Chat に貼る** — Chat (Ctrl+L) を開き、[`src/office-task/README.md`](./src/office-task/README.md) から目的のプロンプトをコピペして送信

詳細は段階別ドキュメントを参照:

| 段階 | 内容 | ドキュメント | 所要時間 |
|---|---|---|---|
| Phase 1 | Cursor を Windows に手動インストール + サインイン | [`02_環境構築ガイド.md`](./docs/教育資料/02_環境構築ガイド.md) | 10〜20 分 |
| Phase 2 | リポジトリを Cursor で開いて Chat にプロンプト投入 | [`03_ハンズオン.md`](./docs/教育資料/03_ハンズオン.md) | 5〜10 分 |
| Cursor の使い方 | Hobby 枠の制約 + Chat / Composer / Tab / Inline Edit | [`04_Cursor操作.md`](./docs/教育資料/04_Cursor操作.md) | 必要時 |

動作確認・運用は [`docs/05_運用.md`](./docs/05_運用.md) と [`docs/04_検証.md`](./docs/04_検証.md) 参照。

---

## ディレクトリ

```
office-automation-starter/
├── README.md                                                ← 入口（最小、機能概要のみ）
├── AGENTS.md                                                ← 汎用 AI コーディングアシスタント向け作業ガイド
├── .cursor/rules/repo.mdc                                   ← Cursor 用プロジェクトルール
├── docs/                                                    ← 仕様・運用・検証ドキュメント
│   └── 教育資料/                                            ← 利用者向け手順書
│       ├── 00_導入スライド.md       ← 手を動かす前の導入（なぜ Cursor / リターン）
│       ├── 01_クイックスタート.md   ← 最短 15 分版（最初はこれ）
│       ├── 02_環境構築ガイド.md    ← Cursor 導入（詳細版）
│       ├── 03_ハンズオン.md       ← ZIP DL → Open Folder → Chat 投入
│       └── 04_Cursor操作.md      ← 操作リファレンス & 統合トラブルシューティング
└── src/
    └── office-task/                                         ← 事務処理タスク（プロンプトメモ + データ）
```

実体ファイルの目録は [`docs/03_実装カタログ.md`](./docs/03_実装カタログ.md) に集約。

---

## ドキュメント

| ファイル | 役割 |
|---|---|
| [`00_導入スライド.md`](./docs/教育資料/00_導入スライド.md) | **手を動かす前の導入（なぜ AI 業務効率化か / なぜ Cursor か / 得られるリターン）** |
| [`01_クイックスタート.md`](./docs/教育資料/01_クイックスタート.md) | **15 分で Cursor を動かす最短ルート（最初はこれ）** |
| [`02_環境構築ガイド.md`](./docs/教育資料/02_環境構築ガイド.md) | Cursor を Windows にインストール + サインインする詳細手順書 |
| [`03_ハンズオン.md`](./docs/教育資料/03_ハンズオン.md) | ZIP ダウンロード → Cursor で Open Folder → Chat に投入の詳細版 |
| [`04_Cursor操作.md`](./docs/教育資料/04_Cursor操作.md) | 操作リファレンス（Hobby 枠 + Chat / Composer / Tab / Inline / `@file`）& 統合トラブルシューティング |
| [`docs/01_仕様と設計.md`](./docs/01_仕様と設計.md) | ユーザー像・ゴール・全体構成・設計上の決め事 |
| [`docs/02_移行ロードマップ.md`](./docs/02_移行ロードマップ.md) | 今後追加したいプロンプト／ドキュメントの backlog |
| [`docs/03_実装カタログ.md`](./docs/03_実装カタログ.md) | 実体ファイル目録 |
| [`docs/04_検証.md`](./docs/04_検証.md) | Cursor 起動・プロンプト投入の動作確認手順 |
| [`docs/05_運用.md`](./docs/05_運用.md) | 利用者の作業フロー（Cursor → Open Folder → Chat） |
| [`docs/README.md`](./docs/README.md) | docs 群の運用ルール・権威順位 |
| [`AGENTS.md`](./AGENTS.md) | 汎用 AI コーディングアシスタント向け作業ガイド（設計ルール・編集規約） |
| [`src/office-task/README.md`](./src/office-task/README.md) | 事務処理タスク用のプロンプトメモ（コピペ前提） |

---

## 設計上の前提（要点）

- **対象 OS は Windows 10/11 のみ**
- **Cursor の Hobby 枠（無料プラン）だけ** で完結する。Slow request の月次上限と利用可能モデルの制限を意識する（詳細は [`04_Cursor操作.md`](./docs/教育資料/04_Cursor操作.md)）
- **Python / Node.js などのプログラミングランタイムはインストールしない**。Windows 標準機能（PowerShell / Excel / エクスプローラ / Edge）または Cursor 内のファイル読み書きで完結する解を Cursor に依頼する
- `src/office-task/` のファイル操作タスクでは **元ファイルは変更・移動・削除しない**（コピーを作って新しい名前で同じ場所に保存する）
- プロンプトメモ（`src/office-task/README.md`）は **共通項目を上部に DRY 化せず**、各セクションを自己完結させる（利用者が単独でコピペ可能にする）
- ドキュメント・コミットメッセージはすべて **日本語**
