GASではなくNextjs-Vercel戦略

そもそもNextjsじゃなくてSpringBoot Thymeleaf + Renderのが技術乱立しないのでよいのでは？
Nextjs-Vercelのがある程度高速だと思うが。。。



VercelってSpringBoot Thymeleafをデプロイ稼働できる？

27s考えました
結論：できます。2026年6月から正式対応しています。
VercelでSpring Boot + Thymeleafをデプロイし、動的なWebアプリケーションとして稼働させることが可能です。

2026年6月30日、VercelがDockerコンテナの正式サポートを発表しました。公式記事でもSpring BootとJavaが明示されています。

Vercel

従来の「VercelはJavaを動かせない」という認識は、現在では古くなっています。

1. 対応状況
機能

対応

Java 17 / 21

 Docker経由

Spring Boot


Thymeleaf（SSR）


Spring MVC / REST API


PostgreSQL外部接続


Dockerコンテナ


常時起動保証


ローカルファイル永続化


2. デプロイ方法
Dockerfile.vercel をプロジェクト直下に作成します。


FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app
COPY pom.xml .
COPY src ./src

RUN mvn package -DskipTests

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

CMD ["sh", "-c", "exec java -Dserver.port=${PORT:-80} -jar app.jar"]

あとはVercelにGitHubリポジトリを連携するか、CLIからデプロイします。

vercel deploy --prod

Thymeleafのテンプレートは通常どおり src/main/resources/templates に置けます。

3. 最大の注意点
VercelのDockerコンテナは、一般的な常時稼働サーバーではなく、Vercel Functions上で動作します。

本番環境では、リクエストが5分間ないコンテナは自動的に停止対象になります。

Vercel Knowledge Base

Spring Bootの場合、次の点が問題になり得ます。

JVM・Spring ApplicationContext起動によるコールドスタート

@Scheduled などの常駐ジョブは不向き

HTTPセッションのインメモリ保持は避ける

DB接続プールをインスタンスの増減に合わせて設計する

4. 実務的な判断
用途

判断

Spring Boot + Thymeleaf教材

◎

ポートフォリオ公開

◎

小規模なCRUDアプリ

○

常時稼働を前提とする業務アプリ

△

バックグラウンド処理主体

×

Spring Boot + Thymeleafの教材や学習用アプリをGitHubから公開する目的であれば、Vercelは十分に候補になります。

ただし、Javaの起動時間やメモリ消費を考えると、本格運用ではCloud Runなどとの比較が必要です。

公式資料：
Run any Dockerfile on Vercel（2026年6月30日）

今回の重要な変化は、VercelがNext.js中心のホスティングから、Javaを含む汎用コンテナ実行基盤へ対応範囲を広げたことです。

逆に、Spring Bootを比較的容易にデプロイできる候補は？

31s考えました
結論：Spring Boot + Thymeleafなら、Railway・Render・Koyeb・Cloud Runが有力です。
特に、GitHubにpushするだけで公開できる手軽さを重視するならRailway、本格的なクラウド基盤まで視野に入れるならGoogle Cloud Runを推奨します。

主要ホスティング比較（2026年10月）
サービス

デプロイ容易性

無料利用

評価

Railway

◎ 非常に簡単

月$1クレジット

手軽さ1位

Render

○ 簡単

無料インスタンスあり

無料教材向き

Koyeb

◎ 非常に簡単

無料枠あり

有力候補

Google Cloud Run

○ 比較的簡単

従量課金の無料枠

総合的に有力

Heroku

◎ 非常に簡単

恒久無料なし

Javaとの親和性が高い

Fly.io

○ やや設定が必要

原則従量課金

小型VM運用に強い

AWS App Runner

○ 比較的簡単

基本的に有料

AWS連携向き

Railway、Koyeb、Cloud Run、HerokuはいずれもSpring Boot向けの公式デプロイ手順があります。

Railway Guides
+3

どれを選ぶべきか
Railway Getting Started: Deploy Your First App Easily

1. 
Railway
 — 最小の手間で公開

GitHubリポジトリを指定するだけで、Spring Bootを自動ビルド・デプロイできます。Dockerfileは必須ではありません。PostgreSQLも同一プロジェクト内で追加可能です。

ただし、無料枠は月$1相当なので、常時起動には不足しやすいです。

Railway Docs

Google Cloud Run Logo PNG Vector (SVG) Free Download

2. 
Google Cloud Run
 — 運用・コスト面で有力

実はDockerfileがなくても、Spring Bootのソースから直接デプロイできます。

gcloud run deploy --source .

リクエストベース課金の無料枠は月200万リクエストに加え、CPU・メモリ使用量の無料枠もあります。ただし、ビルドやイメージ保存などは別料金になり得ます。

docs.cloud.google.com
+1

Render: $100 Million Series C Extension At $1.5 Billion Valuation Raised For Modern Cloud Platform

3. 
Render
 — 無料公開の候補

Javaのネイティブランタイムがないため、Dockerfileが必要です。

無料Webサービスは15分間アクセスがなければ停止し、再起動に1分程度かかる場合があります。また無料PostgreSQLは作成から30日で期限切れになります。

Render Docs
+1

Exploring Koyeb for FastAPI Deployment | Giselle Martinez-Sanchez posted on the topic | LinkedIn

4. 
Koyeb
 — 無料枠で試せる

Java・Spring Bootの直接デプロイに対応しています。

無料インスタンスは512MB RAM・0.1 vCPUで、1時間無通信なら停止します。Spring Bootでは特にCPUの弱さが問題になりやすく、無料枠は動作確認向けです。

Koyeb
+1

私ならこう使い分けます
今回の目的が Spring Boot + Thymeleafの教材・ポートフォリオを継続公開することであれば、次の優先順位です。

Cloud Run — 既にGCPを使っているなら、追加の学習負担が小さく、無料枠と運用機能のバランスがよい

Railway — クラウド設定を極力省き、アプリ実装に集中したいなら最適

Render — Dockerも教材に含め、無料の公開環境を確保したい場合

特に重要なのは、Spring BootはJVMの起動時間とメモリ消費があるため、単に無料インスタンスが存在するだけでは十分ではないという点です。

Cloud Runなら最小インスタンス0、十分な起動時メモリを確保する構成にできるため、低アクセスのSpring Boot教材とは相性がよいと考えます。

そして、Thymeleaf自体はSpring Boot内のテンプレートエンジンなので、特別なホスティング対応は必要ありません。Spring Bootが正常に稼働すれば、そのままSSRできます。

ここでもGithubが立ちはだかるｗ
そうなんですよね（笑）。

もはやGitHubは単なるソースコード管理ではなく、クラウドサービスへのデプロイを統合するハブになっています。

特に面白いのは、Spring Bootのような従来型のWebアプリケーションまで、その構造に取り込まれていることです。

GitHub

ソースコード・Pull Request・GitHub Actions
Railway

Render

Cloud Run

Spring Boot + Thymeleaf

ビルド・デプロイ・Web公開
ただし、GitHubが必須というわけではありません。

例えばCloud Runなら、ローカルのSpring Bootプロジェクトから直接、

gcloud run deploy --source .

で公開できます。

それでもGitHubを使う人が多いのは、GitHubを中心に据えることで、ソース管理・CI/CD・デプロイ・履歴管理まで一本化できるからでしょう。

GitHub自体がPaaSではないのに、PaaSの利用体験まで支配する入口になっている。 ここが非常に強い構造ですね。

railway,renderもcliがあればいけるのに、、、

例えばCloud Runなら、ローカルのSpring Bootプロジェクトから直接、

gcloud run deploy --source .
で公開できます。


16s考えました
実は、Railwayは既に実現しています（笑）。GitHub不要です。

しかも、Spring Boot + ThymeleafをDockerfileなしでデプロイできます。

# Railway
railway login
railway init
railway up
railway domain

railway up はローカルのソースコードを直接アップロードし、Railway側でビルド・デプロイします。railway domain で公開URLも発行できます。

Railway Docs
+1

つまり、次の比較になります。

サービス

CLI

ローカルソース直接デプロイ

GitHub不要

Railway

railway up

◎

◎

Cloud Run

gcloud run deploy --source .

◎

◎

Render

render deploys create

×

○ Docker経由

ここで重要なのは、CLIが存在することと、ローカルソースを直接デプロイできることは別だという点です。

Renderは少し惜しい
Renderにも公式CLIがあります。しかし、基本的にはGitリポジトリまたはコンテナレジストリにある成果物のデプロイを指示する仕組みです。

Render Docs
+1

GitHubなしで動かすなら、例えば次の経路です。

docker build -t my-spring-app .
docker tag my-spring-app mydockerhub/my-spring-app
docker push mydockerhub/my-spring-app

# 事前作成したRenderサービスを更新
render deploys create <service-id> \
  --image mydockerhub/my-spring-app

この場合、Docker Hubなどのレジストリが必要になります。

つまり、現時点では
Spring Boot + Thymeleafを「ローカルコード → CLI → 公開」の最短経路で運用するなら、RailwayとCloud Runが非常に強いです。

特にRailwayはSpring Bootを自動認識し、コンテナビルドまで面倒を見てくれます。

GitHubをデプロイの必須経路から外し、必要ならソース管理にだけ使う。この分離ができるのは、個人教材の運用でも魅力的ですね。




¥0
