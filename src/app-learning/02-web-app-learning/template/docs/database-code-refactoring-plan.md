> 過去の実装・検証記録です。2026-10-27の教育目的での軽量化により、一部機能を廃止しました。現在の仕様・完了状況は[教育用の最小構成](educational-baseline.md)を優先し、以下を追加実装の指示として扱わないでください。

# 横展開前のDB・コード整理結果

2026-10-27更新。採用したリファクタリングを実施。機能を削らず、変更前バックアップ・回帰試験・別スキーマ復元で確認する。最新の結果は[完了記録](completion-report.md)。提供者は02 Web → 01 GAS、受講者は01 GAS → 02 Web。

| 段階 | 実施内容 | 確認 |
|---|---|---|
| 0 基準保存 | 変更前V8のDB・画像・設定をZIP保存。更新後も別ZIP保存 | 元データを上書きせず保持 |
| 1 DB棚卸し | 下表で所有・制約・索引・保存／削除方針を固定 | 値の正本と変更責任を明記 |
| 2 重複整理 | PostFormResponseで作成／編集のJSON応答を共通化、画像配信をPostImageControllerへ分離 | 既存HTML・JSON・入力保持・画像失敗の回帰試験 |
| 3 DB変更 | V9でAI要求台帳、投稿画像の種別NULL拒否制約 | 既存13投稿を保持して移行、違反値の拒否を統合テスト |
| 4 運用分離 | UserReferences／ImageReferences／RecoveryDataset | 投稿依存なしのユーザーディレクトリ構成で照会・復元 |
| 5 UI整理 | 共通UI・投稿・AI下書きのJSを分離、UiContextで組立て | 画像ON/OFF、フォーム、戻る、再送、検索、PC／スマホ |
| 6 横展開受入 | app_template_restore_final_20261027へ復元、別ポートで起動 | 13投稿・3ユーザー・5画像、教材12投稿と4画像を実表示 |

## DBの責任と保持

| 表 | 所有／更新経路 | 制約・索引／削除方針 |
|---|---|---|
| app_users | authors、AuthorStore | UUID PK、名前必須80字。利用件数・FKで参照中削除を拒否 |
| posts | posts、PostStore | user FK RESTRICT、title/body、画像3項目、version。全更新はversion比較・増分。user/date、全体date/id、user/date/id索引 |
| user_icons | authors、IconStore | user PK/FK CASCADEで1人1件、画像3項目NOT NULL・種別。置換・削除は後片付けキュー |
| app_settings | settingsの許可／authorsの既定指定 | 1行制約、既定FK SET NULL、許可モデル最大2000字。論理責任を分け、物理表は維持 |
| post_requests | postsの再送受付 | UUID PK・ハッシュ。投稿削除後も要求受付を保持し、再送による復活を防ぐ。自動削除しない |
| ai_requests | ai、DraftStore | UUID PK、所有・ハッシュ・用途／版・モデル・状態・結果。結果は7日、受付記録は保持 |
| image_cleanup | platform、CleanupQueue | bucket/key複合PK。参照中は保持、削除成功後に除去。復元では旧キーを再実行させない |
| operation_events | platform、AuditTrail | UUID PK、created_at索引。本文なし。自動削除しない。退避した上で運用者が必要な保管期間を決める |

一覧・利用者別・部分一致検索のEXPLAIN ANALYZEを専用テストスキーマで採取する（`target/query-plans.txt`）。今回の小規模データでは順次走査＋ソートが選択され、約0.05〜0.09msだった。大規模性能の証拠にはしない。V1のuser/date索引はV5と先頭列が重なるが、大規模な書込・読取測定なしに削除せず、索引の増減は行わなかった。

## 境界と変更方法

- 利用者への教材データ参照は `UserReferences`。一覧時に全利用件数をまとめて取得し、`AuthorView.usageCount` に投影。参照0件なら削除可能、FKは最後の競合ガード。
- 画像列挙は各教材Adapterの `ImageReferences.images()`。共通運用Controllerに業務SQLを置かない。
- 復元対象は `TemplateRecoveryDataset`。外部キー順に表、画像有無、復元可否を明記する。新規表はFlywayで作り、復旧定義・テストへ同時に追加する。
- ZIP形式2は対象表一覧とFlyway版の一致を要求する。形式1／異なる版はそのバックアップを作った版のアプリで復元してから移行する。
- `UiContext` は教材の組立て地点。リンク・CSS・JSだけを変更し、共通シェルを複製しない。
- Domain/ApplicationはSpring・HTTP・SQL・ImageIO非依存。公開APIを経由し、他モジュールのinternalに依存しない。

## 戻し方

変更前のZIPと対応コード版を保持する。V9適用後に適用済みマイグレーションを編集・削除しない。復旧は対応コードとバックアップを使って新しい復元先を作り、画像・設定を確認した後に接続先を切り替える。元スキーマ・元画像キーへ上書きしない。具体手順は[運用手順](operations-runbook.md)。

GASへ展開するのは用途・入力条件・期待結果・失敗時案内。Java／JDBC／StorageのAdapterをそのまま移植せず、GAS側の保存・権限・実行制限を別途検証する。
