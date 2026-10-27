# ADR 0002: Webテンプレートを機能別モジュールとPort/Adapterで構成する

- 日付：2026-10-27
- 状態：採用
- 対象：`src/web-app-starter/template`
- 関連：[技術スタック](0001-web-app-stack.md)、[実装構造](../../src/web-app-starter/template/docs/architecture.md)

## 背景

投稿、ユーザー、アイコン、設定、画像保存、共通画面が一つのJavaパッケージに集まり、変更の影響範囲と技術依存が分かりにくくなった。提供者がAIと機能を改修し、同じ土台を別アプリへ展開できる構造が必要である。

## 決定

Clean Architecture寄りの依存方向、DDD Liteの業務ルール、Modular Monolithの機能境界を組み合わせる。一つのSpring Bootアプリとして稼働させる。

1. `posts`・`authors`・`settings`・`games` を機能単位とし、公開APIと `internal` を分ける。
2. Domain/ApplicationにSpring・SQL・HTTP・画像ライブラリを持ち込まない。DB・画像保存・トランザクション等の交換点だけにPortを設ける。
3. `platform` に技術Adapter、`shell` に画面組み立て、`exports` にCSV、`bootstrap` に開発用シードを分離する。
4. 投稿内容・名前・投稿が残るユーザーの削除禁止を業務ルールとして検査する。外部キーも維持する。
5. Spring Modulith 2.1.1をテスト依存として導入し、ArchUnitとともに循環・内部参照・許可していない依存方向を検査する。
6. 既存のURL・DBマイグレーション・Storage・選択Cookie・デフォルト設定・画面デザインを維持する。

## 理由と限界

全体をレイヤー別パッケージにすると、一機能の修正が分散する。機能別だけでは内部実装の直接参照を防げないため、公開APIと構造テストを組み合わせる。全クラスのinterface化、イベントソーシング、マイクロサービス化は採用しない。

同一DBの一覧表示ではユーザー名・投稿数の読取結合を許容する。モジュール間のSQLスキーマ依存をゼロにする設計ではない。別DB化の際は読取投影を見直す。開発シードは複数テーブルを扱う例外としてAdapterに閉じ込める。

ファイル数とSpringの組み立てコードは増える。その代わり、業務ルールと障害時の処理をDBなしで検証でき、他機能への影響を構造テストで早期に検出できる。これは提供者向けの実装品質の方針であり、学習者に全技術・全層の習得を要求するものではない。

## 互換性の根拠

Java 17・Spring Boot 4.1.2を維持する。Springの[世代対応表](https://spring.io/projects/generations/)にあるBoot 4.1とModulith 2.1の対応、および[モジュール検証の公式文書](https://docs.spring.io/spring-modulith/reference/verification.html)を2026-10-27に確認した。採用版は2.1.1に固定し、実行結果は対象テンプレートの検証記録で管理する。
