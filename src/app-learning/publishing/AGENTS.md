# 公開原稿・設定の編集ルール

- 上位AGENTS.mdと `../docs/publication/separation-policy.md` を守る。現行の出口は `realname-general`・`alias-nightlife`・`alias-general` の3つ。
- ①・③には専門情報を含めない。②・③には本名や①との対応を含めない。②と③は別の活動名・連絡先を使い、プロフィール・窓口を共有しない。
- 原稿は `content/`、許可は `catalog.yaml`、出口別設定は `publish.yaml` を編集する。アプリ仕様や内部設計をここへコピーしない。
- 公開名・連絡先が未定ならnullを維持する。公開フラグやレビュー状態を、検査を通す目的だけで変更しない。
- 2026-10-28ユーザー指定の紹介WIPは、別々の仮名と窓口「準備中」で一般公開する。`wip.yaml`・`content/wip.json`・`scripts/build_wip.py` を使い、教材の公開フラグやdraftを変更しない。正本は `../docs/publication/wip-release.md`。WIP変更時は `python scripts/test_wip.py` と当該出口の生成・公開後確認を行う。
- `python scripts/check_publication.py` で構造検査する。検査コード変更時は `python scripts/test_publication.py` も実行する。実行場所はこのディレクトリ。
- 検査は生成・公開・認証確認ではない。未作成の生成コマンドや現在のデモを検証済みの新サイトとして案内しない。
- `dist/`・`.local/` はGit管理外。全台帳・設定・内部資料・Git履歴を配信しない。本名辞書や秘密値を新規にGitへ書かない。
