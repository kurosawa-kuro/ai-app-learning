# AIコーディング環境の導入と運用

標準検索を入口にし、RTKは明示呼出し、Serenaは参照調査が必要なセッションで使う。常時読む規約は`AGENTS.md`へ、探索手順は[code-navigation](../../.agents/skills/code-navigation/SKILL.md)へ分ける。設定の生成、端末への導入、クライアント接続、実作業の効果は別々に確認する。

## 生成直後の状態

- `.codex/config.toml`にはSerenaを登録済み、`enabled = false`。未導入端末でも通常作業を始められる。
- `.serena/project.yml`は読取り中心。プロジェクト名は生成先から設定される。候補言語はRust / Python / TypeScriptで、初回有効化前に実際に使う言語だけを残す。他言語はSerenaの対応状況を確認して置き換える。
- `.serena/.gitignore`はproject.ymlと自身以外のキャッシュ・記憶・ログを除外する。共有すべき判断はdocsへ昇格する。
- RTK/Serena本体のインストール、MCP起動、全体index、自動書換えhook、ユーザー設定変更は生成器が行わない。`.mcp.json`はClaude用の空stubを維持する。

## 端末の準備

RTKを使う場合は[公式release](https://github.com/rtk-ai/rtk/releases)からOS・CPUに合うOSS版を選び、配布digestを照合してPATH上へ配置する。Serenaはuvがある端末で次のように独立環境へ導入できる。初期互換性の基準はRTK OSS 1.1.0 / Serena 2.1.0。これは最新版の指定や、全OS・全言語での検証済み宣言ではない。

```sh
uv tool install --python 3.13 serena-agent==2.1.0
rtk --version
serena --version
codex --version
```

CLIやGUIから実行ファイルが見つからなければ、そのクライアントのPATHを確認する。Rustは生成先rootで`rust-analyzer --version`を確認し、不足時はそのrepoが選択するtoolchainへ`rustup component add rust-analyzer`を実行する。他の言語も使うLSPと依存環境を確認する。

## RTKを明示的に使う

対象projectの既存テスト・lintコマンドと同じ引数を渡す。

```sh
rtk git status
rtk cargo test
rtk pytest
rtk ruff check .
```

初回は対象projectの成功・失敗について、元コマンドと圧縮版の終了コード、成功件数、主要診断を照合する。テスト0件やskipを実テストの合格と扱わない。`cargo build` / `clippy` / `tsc` / `mypy`等は必要が生じた時に個別評価する。

正確なdiffや全件一覧は通常コマンドを使う。圧縮で診断が不足すれば、元ログを保存・取得するか安全に再実行する。副作用のある操作をログ取得のために無条件で再実行しない。`rtk init`による全コマンドのhook化は初期設定に含めない。

## Codexで必要時だけSerenaを使う

生成先をGit repoとして開き、クライアントで信頼済みprojectとして扱えることを確認する。repo rootから設定解決を確認し、そのセッションだけ有効化する。

```sh
codex mcp get serena
codex -c mcp_servers.serena.enabled=true mcp get serena
codex -c mcp_servers.serena.enabled=true
```

上の最初の確認は既定無効、次はその呼出しのみ有効になる想定。取得できない場合はproject設定の読込み・信頼状態・クライアント版を確認する。モデルや権限、既存のMCP・hooksを変更して解決しようとしない。

新規セッションで`code-navigation`の検出と本文参照を確認する。Serenaも初期化・ツール一覧に続いて、対象repoの実シンボルと参照元を1件取得し、元ソースと照合する。`--project-from-cwd`を使うため親フォルダから起動しない。デスクトップ・IDEは各クライアントの設定読込みと接続を確認し、CLIの成功だけで代用しない。

セッション終了後は既定無効に戻る。継続有効化してしまった場合はrepo設定を`enabled = false`へ戻す。RTKは明示呼出しを通常コマンドに戻せば利用を停止できる。

## 効果を確認して使い分ける

まず実際に必要な小さな修正を1件選び、課題・開始commitと差分・モデル・推論設定・クライアント・受入条件を固定する。通常手順とRTKのみを別の新規セッション・隔離checkoutで比較する。最初の1組で計測可能性を確かめ、順序を逆にしてもう1組行う。以前の回答を次の試行へ渡さず、cacheの状態と初期化も記録する。

Serenaは複数ファイルの参照調査を要する実課題で単独比較する。小さな修正のために探索を増やさず、両ツールの併用比較は単独評価の後に行う。[実作業の記録書式](../templates/ai-coding-measurement.md)をtaskのVerificationへコピーし、失敗・再試行・原文再取得も残す。取得できないusageは未計測とする。

同じ品質を満たした場合に、完了時間・手戻り・実usage・保守負担を比較する。出力bytesや推定tokenを実際の料金・サブスクリプション使用枠へ置き換えない。診断が欠ける用途は適用を止め、利点が不明なら標準検索を維持する。再読が多ければ入口とSkillを直し、トークン削減だけを理由にコードを細分化しない。結果の一般化や追加ツール導入を急がない。

## 既存プロジェクトへ取り込む

新規生成先は上記のファイルが最初から揃う。既存projectへ生成器を再実行すると、既存ファイルはskipされ、設定は自動mergeされない。別の一時ディレクトリへ生成して差分を確認し、設定・Skill・runbook・記録書式とAGENTS/READMEの案内を必要箇所だけ統合する。`.codex/config.toml`の他のMCP・モデル・権限、既存Serenaの言語・除外指定を保持する。`--force`は全生成対象を上書きするため、設定の追加だけに使わない。

## 仕様の確認先

更新時は導入先の版と[Codex Skills](https://learn.chatgpt.com/docs/build-skills)、[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)、[Serena設定](https://oraios.github.io/serena/02-usage/050_configuration.html)を照合する。設定を配布したことと、効果を実測したことを区別する。
