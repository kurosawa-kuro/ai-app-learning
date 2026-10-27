# テンプレートの構造と改修の入口

2026-10-27。提供者が機能を改修し、失敗を検証しやすくするための設計資料。利用者が全層を学ぶことを利用開始の条件にはしない。

採用方針は **Clean Architecture × DDD Lite × Modular Monolith**。一つのSpring Bootアプリ・一つのDBで動かし、機能間の境界をテストで守る。[採用理由（ADR）](../../../../docs/adr/0002-web-template-modules.md)も参照。

## 機能と依存方向

Javaの起点は `com.example.webapptemplate`。各モジュール直下の公開APIを通して連携し、他モジュールの `internal` を参照しない。

```mermaid
flowchart TD
    Shell["shell：共通画面の組み立て"] --> Authors["authors：ユーザー・アイコン・選択"]
    Shell --> Settings["settings：機能許可"]
    Shell --> Platform["platform：技術PortとAdapter"]
    Posts["posts：投稿"] --> Authors
    Posts --> Settings
    Posts --> Platform
    Authors --> Platform
    Settings --> Platform
    Exports["exports：CSV"] --> Authors
    Exports --> Posts
    Bootstrap["bootstrap：開発用シード"] --> Settings
    Bootstrap --> Platform
    Games["games：じゃんけん体験"]
```

| モジュール | 公開API・担当 |
|---|---|
| `posts` | `PostOperations`、`PostView`。投稿の一覧・作成・削除 |
| `authors` | `AuthorOperations`、`AuthorView`、`UserIcons`。登録・削除・既定ユーザー・選択解決・アイコン |
| `settings` | `FeaturePolicy`、`SettingsOperations`。画像投稿・AI利用の許可と設定保存 |
| `platform` | `ImageStore`、`ImageCodec`、`ImageCleanup`、`UnitOfWork`。外部保存・画像変換・後片付け・トランザクション |
| `shell` | 共通ナビと画面モデル。機能の公開APIを呼ぶWeb側の組み立て |
| `exports` | CSV用のWeb Adapter。ユーザー・投稿の公開読取APIを利用 |
| `games` | DB不要の画面。ルールはブラウザー側の純粋関数 |
| `bootstrap` | 明示実行のシードコマンドとSQL Adapter。通常の業務処理から利用しない |

## 一つの機能の中

```text
posts/
  PostOperations.java                 他機能が呼ぶ公開API
  PostView.java                       読取結果
  internal/
    domain/PostContent.java           タイトル・本文の不変条件
    application/PostService.java      保存・失敗時の補償などの手順
    application/PostStore.java        手順から見たDB保存のPort
    adapter/web/PostController.java   HTTP、入力保持、画面とJSON応答
    adapter/persistence/JdbcPostStore.java  SQL
    PostsConfiguration.java           Springによる接続
```

Web → Application → Domain の順に呼ぶ。ApplicationはPortを呼び、JDBCやSupabaseのAdapterが実装する。DomainとApplicationはSpring・HTTP・SQL・ImageIOに依存しない。全クラスにinterfaceを作らず、外部境界と他機能向けAPIに絞る。処理のないゲームに空のJava Domain/Application層は作らない。

`PostContent` がタイトル1〜120文字・本文5000文字以内、`AuthorName` が名前1〜80文字を検査する。コントローラー経由でなくても同じ制約が働く。`AuthorDeletion` は投稿があるユーザーの削除を拒否する。

投稿一覧は `PostOperations.page()` が1ページ10件の `PostPage` を返す。`PostStore.count()` と `page()` で件数と対象行を取得し、JDBC Adapterで `LIMIT/OFFSET` を適用する。順序は作成日時の降順・IDの昇順に固定し、V5で全体・投稿者別の複合インデックスを追加する。`posts()` の全件取得は明示的なCSV出力向けに維持する。深いページのOFFSETと総件数のCOUNTにはデータ量に応じた負担が残るため、大規模化した場合はカーソル方式を検討する。更新中の一覧はライブデータであり、ページ移動をまたぐスナップショットは保持しない。

削除ではユーザー行をロックし、投稿数を確認してからアイコンの後片付けを登録し、ユーザーを削除する。全処理を同じDBトランザクションで行い、外部キー制約を最後の競合防止として維持する。

`JdbcAuthorStore` の投稿数と `JdbcPostStore` のユーザー名は、一覧表示用のSQL結合による読取投影。互いのRepositoryやServiceを参照しないが、テーブル構造への依存は残る。現段階では同一DBの利点を使う判断であり、DBまで独立したモジュールではない。将来別DBに分ける場合は、読取投影または公開照会APIを先に見直す。

## 画像とトランザクション

| 役割 | Port | 実装 |
|---|---|---|
| 画像の保存・取得・削除 | `ImageStore` | `SupabaseImageStore` |
| JPEG/PNG検査・再エンコード・256pxアイコン | `ImageCodec` | `ImageIoCodec` |
| DBの一括処理 | `UnitOfWork` | `SpringUnitOfWork` |
| 削除待ち画像の再試行 | `ImageCleanup` | `RetryImageCleanup` + `JdbcCleanupQueue` |
| 参照中の画像を削除しない照会 | `ImageReferences` | 投稿・アイコンの各JDBC Adapter |

`ImageUpload` はHTTPファイル型ではなく、上限検査済みのバイト列。`Uploads` がWebの `MultipartFile` から変換する。画像設定は `FeaturePolicy` で判断し、StorageのAdapterに業務設定を持ち込まない。投稿がOFFでもユーザーアイコンは使用できる。

投稿は画像保存後にDB登録し、DB失敗時に今回の画像を削除する。画像削除が失敗した投稿はDBに残して再試行できる。アイコンの差し替え・ユーザー削除・シード置換は削除待ち情報をDBへ残し、コミット後に後片付けする。`platform` は具体的な投稿・ユーザーテーブルを知らず、各機能が提供する `ImageReferences` で参照を確認する。

投稿作成の補償削除自体が失敗した場合はログを残す方式を維持している。全アップロードの強制終了・DB接続断まで完全に復旧する仕組みではない。将来の耐障害性強化は、アップロード予約や再試行方式を別途設計する。

開発用シードは固定ID・日時・複数テーブルを扱うため `bootstrap/internal/adapter/persistence` に隔離する。Domainの手本としてシードのSQLを業務Serviceへコピーしない。通常起動時には実行しない。

## 選択ユーザーと機能設定

- ブラウザーの選択：`currentAuthor` Cookie。`BrowserSelection` がHTTPへの書き込み、`AuthorOperations.selected()` が存在確認とフォールバックを担当する。認証ではない。
- デフォルトユーザー：DBの `app_settings.default_user_id`。ユーザー機能が担当し、選択済みCookieを書き換えない。
- 画像・AI許可：DBの `app_settings`。設定機能が担当する。同じテーブルでも、既定ユーザー更新と機能許可更新のPortを分ける。

機能禁止は画面の非表示だけでなく処理開始時にも確認する。将来AI処理を実装する場合は `FeaturePolicy.requireAiEnabled()` を通す。現在はAI通信自体が未実装。

## UIの境界

- `templates/ui` と `static/ui`：幅・共通部品・ポップアップの配置・フォーカス・削除確認・画像プレビュー。
- `static/features/authors/user-selection.js`：選択一覧の取得、検索、CSRF付き切替。成功時に `app:user-selected` を発行。
- `static/features/posts/posts.js`：下書きと添付を維持して投稿者を反映し、投稿の非同期保存を行う。
- `static/examples/janken-rules.js`：DOM・乱数に依存しない勝敗と加点の計算。`skill-janken.js` が画面と乱数を担当。

共通JSはユーザーAPIへ通信しない。機能別JSが `AppUI` の共通操作を利用する。URL・テーマ・既存の画面導線は維持する。部品の詳細は[共通UI設計](ui-foundation.md)を参照。

## 小さな変更を追う例

「ユーザー名の上限を変える」なら、まず `authors/internal/domain/AuthorName` のルールと `DomainTests` の境界値を変更する。次にユーザー登録画面・投稿画面内の追加フォームの `maxlength` とエラー説明を合わせ、DB制約に影響する場合は既存マイグレーションを書き換えず新規マイグレーションを追加する。JavaとPlaywrightのユーザー登録・切替を確認する。

「画像の保存先を変える」なら `ImageStore` の別Adapterを用意し、Springの接続先を切り替える。投稿のルール・手順・画面は変更しない。失敗時の削除・旧画像の参照確認も同じ契約として検証する。

一回の改修で全層を触る必要はない。AIには対象の目的、変更してよい境界、維持する動作、確認コマンドを渡す。

## 検証

テンプレートのディレクトリで実行する。

```powershell
# DBなし：依存方向・業務ルール・投稿の失敗処理
.\mvnw.cmd "-Dtest=ArchitectureTests,DomainTests,PostServiceTests" test
npm run test:unit

# .envの接続情報を使う専用テストスキーマでJava全体
.\run-local.ps1 -Action test

# 専用スキーマ・テスト用Storageバケットで実ブラウザー
npm run test:e2e
```

`ArchitectureTests` はSpring Modulith 2.1.1で循環・他モジュール内部への参照を検査し、ArchUnitで依存方向の許可表とDomain/Applicationの技術依存禁止を検査する。禁止例：`posts` から `authors.internal.adapter.persistence.JdbcAuthorStore` を参照する、Domainへ `JdbcTemplate` を注入する、`authors` から `posts` の公開APIを呼んで循環を作る。どれも構造テストで失敗する。

構造テストは実行時の振る舞い・SQL文字列の結合・設定文字列による参照までは保証しない。Java統合テストとPlaywrightを併用する。Spring Modulithはテスト用途のみで、稼働アプリへイベント基盤や追加DBを導入しない。
