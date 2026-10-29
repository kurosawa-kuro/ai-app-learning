# ADR 0001：WebアプリのスタックをSpring Boot・Render・Supabaseに統一する

- 決定日：2026-10-27
- 状態：採用
- 根拠：ownerの「Nextjs Vercelは廃案にしてSpring Render Supabaseにスタック統一する」という指示。

## 決定

非エンジニア向けの自分用・業務用Webアプリと、GASの既存5教材の発展版は、**Spring Boot＋Thymeleaf＋Render＋Supabase**に統一する。Next.js＋Vercel案は廃止する。

| 責務 | 採用方針 |
|---|---|
| 画面・業務処理 | Java、Spring Boot、Spring MVC、Thymeleaf。JavaScriptは必要な範囲で使用 |
| アプリの実行・公開 | Render上でDockerによるデプロイ |
| 永続DB | SupabaseのPostgreSQLへサーバー側から接続 |
| 画像・添付 | 必要な教材でSupabase Storageを利用 |

## 理由

Java・SQLの知識と実装例を、資格／実務学習とWebアプリ支援で再利用する。提供側の技術・ひな形・導入・検証手順を揃え、最初の動作からAIによる用途別の改修へ進みやすくする。

採用理由は教材と支援の継続性であり、速度や料金の優位を実証したという判断ではない。

## 適用範囲と影響

- 既存GAS版は維持する。Spring Boot版は同じ題材の業務要件・受入条件を使い、1題材ずつ整備する。
- Oracle資格で必要なDB管理・固有SQLはOracle環境で学ぶ。Web教材のPostgreSQL実習で代替した扱いにしない。
- Linux・AWSの実務学習は独立した発展テーマ。Web教材の標準公開先はRenderとする。
- 子供、英語学習者、店舗運営者、非エンジニアのアプリ利用者、資格学習者、事務処理担当者のゴール・支援・評価はそれぞれ定める。スタック統一は共通の必修コースを意味しない。
- 現行のGAS個別仕様やCursor教材の追加ランタイム不要という条件を変更しない。
- この決定ではアプリ実装、環境作成、移行、公開を行わない。最初の移植対象、実装の版、プラン、認証方式、接続設定は対象の実装時に確定・検証する。

## 参照

- [Webアプリ制作の案内](../../src/app-learning/02-web-app-learning/README.md)：構成、支援方法、横展開、公式資料、検証項目
- [GASアプリ集](../../src/app-learning/01-gas-app-learning/README.md)：5教材の役割分担と段階的な整備
- [認証の分担（ADR 0004）](0004-auth-gas-simple-web-supabase.md)：Web版の認証方式をSupabase Authに決定（2026-10-28）
- [Java・Oracle学習戦略](<../../src/java-career-learning/java-career-learning-strategy.md>)：資格と実務の独立した学習入口
