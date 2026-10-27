# 05 データモデル

根拠: [基本仕様・設計 v0.3.0（Draft）](<tasks/01_idea/Cast Evaluation System — 基本仕様・設計.md>) §5〜7、§10〜11。この文書は正本からの派生文書であり、矛盾時は正本を優先する。記載は設計・受入基準であり、実装・検証済みを意味しない。

## 保存方針

Google Sheetsを初期データストアとし、1シートを1テーブルとして3シートだけを使う。評価結果テーブル・ルール履歴テーブル・伝票明細テーブルは設けない。行番号を業務IDに使用しない。

## members

| カラム | 型 | 意味・制約 |
|---|---|---|
| member_id | string | PK。一意のメンバーIDをシステムで自動発行 |
| name | string | キャスト名。本名など不要な個人情報は管理しない |
| status | string | ACTIVE / INACTIVE |

退店時は無効化し、レコードと過去実績を保持する。IDの発行方式・名前の文字数などは未決定。

## daily_records

| カラム | 型 | 意味・制約 |
|---|---|---|
| record_id | string | PK。行番号と独立したレコードID |
| business_date | date | 営業日 |
| member_id | string | 対象メンバーのID |
| drink_count | integer | 0以上のドリンク杯数 |
| bottle_count | integer | 0以上のボトル本数 |
| nomination_count | integer | 0以上の指名件数 |
| accompaniment_count | integer | 0以上の同伴件数 |
| personal_sales | integer | 0以上の個人売上（円） |

一意制約は **business_date + member_id**。既存会計・POS等で確定した日次金額を保存する。販売明細や共同売上按分は保存しない。

Sheetsを使う場合も、サーバー側の検証・排他制御で重複防止を保証する設計とする。過去実績の編集を認める。存在しないmember_id、更新時の営業日・キャスト変更、record_idの生成方式、日付の物理表現は詳細設計で確定する。

## evaluation_rules

| カラム | 型 | 意味 |
|---|---|---|
| category | string | 評価対象。下記の固定値 |
| unit | number | ポイント計算単位 |
| points | number | 付与ポイント |
| enabled | boolean | 有効・無効 |

| category | 対応する実績カラム | 仮のunit | 仮のpoints | 初期enabled |
|---|---|---:|---:|---|
| DRINK | drink_count | 1 | 1 | true |
| BOTTLE | bottle_count | 1 | 5 | true |
| NOMINATION | nomination_count | 1 | 3 | true |
| ACCOMPANIMENT | accompaniment_count | 1 | 5 | true |
| SALES | personal_sales | 10000 | 2 | false |

数値は設計確認用の仮設定であり、業界標準ではない。Sheetsで管理者が直接設定する。専用UIは設けない。

正本はunit・pointsの許容範囲、category重複・欠損時の扱いを定義していない。ゼロ除算を防ぐunitの検証等は必要な詳細設計事項として扱い、確定前に独自ルールを仕様化しない。

## 派生データ・変更

評価結果はmembers・daily_records・evaluation_rulesから都度算出する。対象月の数量・売上を集計してから計算する。式と順位は [03_domain_model.md](03_domain_model.md) に従う。

ルール変更は過去期間へ遡って反映される。運用開始後の変更は管理者が影響を確認する。ルール履歴や過去評価を固定する機能はMVP対象外。

## 環境設定との区別

業務ルールの保存先はevaluation_rules。開発環境の `env/config.yaml`、`doppler.yaml` 等を評価ルールの正本にしない。GASとの設定・秘密情報連携は未整備。秘密情報・実データをリポジトリに記録しない。

スプレッドシートID、スクリプトID、公開先、共有範囲、日付形式等は実装・公開時に決定する。スキーマ変更は対象データ・既存値への影響・復旧方法を記録し、保存済み実績を失わないことを確認する。
