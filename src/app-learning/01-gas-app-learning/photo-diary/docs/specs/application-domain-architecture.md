# 業務ルールと依存関係の設計

2026-10-25：日記・画像・AI生成の主要処理をDomain / Applicationへ分離した。GAS公開API、DB v2の表・列、要求ID、再送時の結果を維持する。本番DB v2移行・公開反映は完了。現在の公開@20と残項目は[受入記録](../../../../docs/tasks/gas-release-20261028.md)を参照。

## 責務と依存方向

| 場所 | 責務 |
|---|---|
| server/domain/ | 日記本文、選択数、画像利用・整理、生成出力・保持・中止の純粋な判断 |
| server/application/ | 日記保存、画像転送、AI生成、手動整理の順序。ロック、再送照合、予約と結果保存 |
| server/bootstrap/composition.js | 具体実装をApplicationの引数へ渡す組立箇所。ファイル読込時に初期化しない |
| server/services/ の互換窓口 | 既存のService名・メソッドを保ち、組立済みApplicationへ委譲する |
| server/models/・db/ | RepositoryのSheets実装、キャッシュ、初期化 |
| server/services/photo/・draft/ の外部アダプター | DriveStore、ImageValidator、GeminiClient、各Provider |
| server/controllers/・presenters/ | GAS入口、レスポンスと表示形式への変換 |

依存は Presentation → Application → Domain。外部操作はApplicationへ引数で渡すポートを通す。具体アダプターの選択は外側で行う。
既存ディレクトリ内のRepositoryやProviderはそのまま外側の実装として使う。フォルダ名の変更を目的とした移動はしない。

AppErrorは core/errors.js にある共通エラー契約を維持する。DomainはAppErrorとJavaScriptの標準機能以外の外部状態に依存しない。現在時刻、設定、参照状況は引数で受け取る。

## 業務領域

- 日記：本文・写真順序・タグ・採用元をまとめて保存する。親の日記が存在することを保存の確定点とする。
- 画像資産：日記とは独立して転送・回復・読取・整理する。DriveファイルIDと内部資産IDを区別する。
- AI生成：要求、入力、出力、利用量、状態を日記とは独立して保持する。日記には採用元IDを残す。

これらは同一GASアプリ内の責務境界であり、独立サービス・独立DBではない。写真・タグの参照を確認した上で日記を保存する。

## ポート契約

各 create*Application_(ports) はオブジェクトを受け取る。使うポートは composition.js の各生成箇所で明示する。巨大な共通コンテキストを全Applicationに渡さない。

| ポート | 必要な保証 |
|---|---|
| lock(fn) | 同期的に排他実行し、例外時も解放する。競合時はbusyとして失敗する |
| database.ensure / ensureIfNeeded | 初期化・移行状態を確認する。旧表の自動移行はしない |
| diaries / requests / assets / uploads / generations / tags | 保存・照合・参照確認を提供する。更新判断にはfreshな読取を使う |
| storage | 画像保管先の検査、作成または回復、読取、ゴミ箱移動 |
| images.decode | 画像入力を検証し、バイト列・MIME・ダイジェストを返す |
| providers() | 現在選べる写真・生成提供元を返す。互換窓口での差替えも維持 |
| clock.date / clock.now | Dateとエポックミリ秒を返す。テストでは固定値を渡せる |
| ids.next / hash | 一意IDと既存の要求照合ハッシュ。ハッシュ入力のversionと正規化を維持 |
| settings / formatDate | 構成値の取得と通信向け日時変換 |

RepositoryポートはDB v2互換のレコード表現を使う。Domainには列名を渡さず、state・createdAt・referenced等の判断材料に変換して渡す。すべてのEntityやIDをクラス化する方式は採らない。

## 状態と回復の契約

- 保存：要求予約 → 写真・タグの関連 → 親日記 → 要求完了。途中停止時は同じIDで回復し、親があれば増やさない。
- 転送：要求予約 → 資産予約 → Drive作成または名前照合による回復 → 資産ready → 要求完了。
- 生成：ロック内でpending → runningを記録し、外部生成はロック外で行う。成功結果は再びロック内で保存する。
- 生成失敗：既知の失敗はfailed、成否不明はunknown。結果保存に失敗するとrunningを保持し、自動で外部生成を繰り返さない。
- 実行中生成：15分を超える再照合でunknownへ記録する。手動中止は15分以上で可能。同じ要求の再生成はしない。
- 生成履歴：succeeded / failedかつ30日を超えたものだけ手動整理できる。ちょうど30日は保持。採用済み日記の本文と由来IDは残す。
- 画像整理：参照なし、保持期限超過、Drive資産、ready / trash_pendingを条件とする。trash_pendingを先に記録し、外部操作後の更新失敗から回復する。

Sheets・Drive・Geminiをまたぐ共通トランザクションはない。層を分離しても予約と回復記録は必要であり、削除しない。

## 検証と変更方法

domain-application.test.mjs はGAS模擬環境・設定・Repositoryを読み込まず、内側の層だけを検証する。
architecture.test.mjs はDomain / Applicationから具体実装への依存が戻ることを検出する。
既存のDB移行・保存障害・画像・AI・画面のテストは、互換窓口から実際の組立とアダプターを通して検証する。

運用診断・性能計測・データ移行はGASに密接な管理処理として従来のサービスに残す。今回の業務ユースケースの分離とは区別する。
本番での権限・通信・データ移行の確認はローカルテストで代替できない。
