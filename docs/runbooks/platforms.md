# GAS・Retoolの選択と作業の境界

この文書は生成環境のGAS・Retool運用を扱う。リポジトリのWebアプリとGAS教材の発展版は[ADR 0001](../adr/0001-web-app-stack.md)によりSpring Boot＋Thymeleaf＋Render＋Supabaseへ統一した。具体的な支援方針・構成・検証は[Webアプリ支援戦略](../../src/app-learning/02-web-app-learning/web-app-support-strategy.md)を参照する。

以下は提供者向けの生成環境の参考手順。Retoolを第五の学習入口やWeb標準基盤に加える意味ではなく、全員の受講条件でもない。教材ごとの実行・公開は個別READMEとrunbookを確認する。

生成kindはstandard / gas / retool / gas-retool。standardは汎用、他のkindは共通のCodex・Claude環境に選択した作業基盤を追加する。すでに作成済みのprojectへ追加する場合は、一時生成先との比較で統合し、既存設定を一括置換しない。

| 生成された領域 | 入口 | ローカルで確認できること |
|---|---|---|
| gas | gas/AGENTS.md、GAS運用手順 | 通常JSのサーバー処理、HTMLの構文、配置対象のbuild |
| retool | retool/AGENTS.md、Retool運用手順 | 照合ツール。実アプリの依存と型検査は公式CLI作業先で実施 |
| gas-retool | 上記両方 | 両作業基盤。サービス同士の接続は未設定 |

プラットフォーム別の運用手順とGAS / Retoolスキルは、そのkindを選んだ場合にだけ生成される。Codexでは`.agents/skills/`、Claudeでは`.claude/skills/`から同じ手順を使う。共通のcode-navigationはCodex向けに維持する。

## 併用時に決めること

GASのHTML Serviceはgoogle.script.runで同じアプリのサーバー関数を呼ぶ。これをRetoolからそのまま呼べるAPIとは扱わない。GASサンプルは本人限定公開が既定で、Retool接続のために匿名公開へ変更しない。

連携する場合は、データ正本・認証主体・操作権限・入出力形式・再試行と冪等性を先に決め、必要な認証付きAPIやGoogle APIの利用を個別実装する。RetoolのResource、GASのScript Properties等のサーバー側へ資格情報を置き、ブラウザへsecretを渡さない。特定組織のDBやMCP URLはスターターへ固定しない。

## 作業の判定

生成、ローカル検査、接続、公開、実機受入を分ける。GASのmock試験とRetool照合ツールの試験が通ってもクラウド接続済みとはしない。実環境の値は個別設定へ置き、[公開・受入書式](../templates/platform-acceptance.md)に検証した範囲を残す。
