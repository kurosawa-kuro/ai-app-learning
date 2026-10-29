# 名刺用WIPの公開・印刷運用

更新：2026-10-28。内部限定。[分離ポリシー](separation-policy.md)を前提に、先行公開の正本をここへまとめる。

2026-10-29再確認：ユーザーは①営業サイトを維持し、②③を別サイトとして運用すると確認。②③の固定URL・CSS・アイコン・robotsはHTTPS 200でローカル成果物と一致し、現行原稿との一致も確認。内部7パスと存在しないページは404。QR PNGと300dpi名刺仕上がり画像を再復号し、各固定URLと一致。WIPテスト7件・構造検査成功。記録は `publishing/.local/output/site-qr-verification-20261029.json`。公開内容の変更・再デプロイは不要。接続可能ブラウザーがなく表示確認は未実施、紙のQR実機確認も未実施。独自ドメインは引き続き後回し。

## 決定と公開先

ユーザーは3サイトのWIP公開・QR決定・名刺の少量注文を依頼。②③の活動名・連絡先は仮データでよい、数量は最小ロットで比較、と回答した。②③は別々の仮名を使い、未開設の窓口は「準備中」とする。架空のメールやLINEへ送信させない。仮名を変更してもURLは維持する。

| 出口 | 表示名 | 公開先 | 名刺QRの値・状態 |
|---|---|---|---|
| ① `realname-general` | 既存の本名・屋号 | [既存Pages](https://kurosawa-system-web.pages.dev/) | `https://kurosawa-system.com/`。候補生成済み。独自ドメイン未接続で印刷保留 |
| ② `alias-nightlife` | 月灯ラボ（仮） | [atelier-m7q4.pages.dev](https://atelier-m7q4.pages.dev/) | `https://atelier-m7q4.pages.dev/`。固定URL確定・WIP公開済み |
| ③ `alias-general` | つむぎデジタル（仮） | [desk-r8v2.pages.dev](https://desk-r8v2.pages.dev/) | `https://desk-r8v2.pages.dev/`。固定URL確定・WIP公開済み |

QRにデプロイごとのハッシュ付きURLを使わない。②③は①のサブドメインに置かず、URLに本人のアカウント名を含めない。相互リンク・共通プロフィール・解析タグは置かない。第三者の推測や過去の共有まで防ぐ保証ではない。

①の実装正本は `C:\Users\owner\.ssh\dev\kurosawa-system-web`。既存Next.js静的出力を維持し、営業マスタで指定済みの氏名・業務内容・営業メール・GitHubを追加した。コードを本リポジトリへ複製しない。

②③はCloudflare Pages Direct Upload。共通のPython生成処理で静的HTML・CSSを作り、別プロジェクトへ配信する。紹介サイトの実装であり、アプリ教材のSpring Boot方針は変更しない。

## 原稿・生成・公開

| 対象 | 正本・扱い |
|---|---|
| ②③のWIP原稿 | 各出口 `content/wip.json` |
| WIP設定 | 各出口 `wip.yaml`。紹介のみ・仮名・一般公開・固定URLを明記 |
| 生成 | `publishing/scripts/build_wip.py`。固定6ファイルのみ生成。原稿ツリーをコピーしない |
| 配信 | `publishing/dist/<出口ID>/` のみ。台帳・JSON原稿・設定・教材・名刺・Git履歴は含めない |
| 教材 | `publish.yaml`・`catalog.yaml` は公開無効・draftのまま。WIP公開は教材レビュー完了を意味しない |

②の一般公開は紹介ページだけ。写メ日記・キャスト評価の題材名は案内するが、実評価データ・デモ・教材・受付フォームは公開しない。今後の教材・実データの閲覧方式は別途決める。全WIPのnoindexは検索抑止でありアクセス制限ではない。

作業場所は `src/app-learning/publishing`。

```powershell
python scripts/test_wip.py
python scripts/build_wip.py --site alias-nightlife
python scripts/build_wip.py --site alias-general
python scripts/check_publication.py
python scripts/test_publication.py
```

配信は既存Wranglerを使用し、変更対象の出口だけ実行する。

```powershell
& 'C:/Users/owner/.ssh/dev/kurosawa-system-web/node_modules/.bin/wrangler.cmd' pages deploy dist/alias-nightlife --project-name atelier-m7q4 --branch main --commit-dirty=true
& 'C:/Users/owner/.ssh/dev/kurosawa-system-web/node_modules/.bin/wrangler.cmd' pages deploy dist/alias-general --project-name desk-r8v2 --branch main --commit-dirty=true
```

公開後は固定URL・CSS・アイコン・404・robots・内部パスの非公開・他名義や専門語の混入を確認する。原稿の編集だけでは再公開されない。

## ①独自ドメインの残作業

2026-10-28ユーザー回答で「独自ドメインは後で対応する」と確定。当面は①の既存Pages標準URLを維持し、独自ドメイン設定を進めない。①のQR候補を標準URLへ勝手に変更せず、①の名刺は印刷保留とする。②③の固定URL・QR・見本準備は独立して進められる。

既存Pagesへ `kurosawa-system.com` を登録済み。API状態は `pending`、理由は `CNAME record not set`。Wrangler OAuthのDNS APIは403、利用できるブラウザーもないためDNS編集は未実施。

Cloudflareの `kurosawa-system-web → Custom domains` から接続を完了する。必要レコードはCNAME、名前 `@`、参照先 `kurosawa-system-web.pages.dev`。同名レコードがあれば用途を確認してから扱う。メール用MX/TXT・既存Tunnelを変更しない。ドメインと証明書のActive、HTTPS応答・内容確認まで①の名刺は印刷しない。

## 名刺の見本

今回は3出口それぞれ1種類。以前の①企業向け／個人向け2案を両方制作した意味ではない。91×55mm横、片面モノクロ、白地、3mm塗り足し、重要要素は仕上がりから3mm以上内側。QRは余白込み22mm角、4セル余白、ロゴなし。

印刷用の本人情報はGit管理外の `publishing/.local/card-profiles.json`。生成物は `.local/output/pdf/<出口ID>/` の `card-review.pdf`・QR PNG/SVG・確認画像。出口別PDFに他出口の対応表・メタデータを混入させない。全出口をまとめたPDFやZIPを公開しない。

```powershell
python scripts/make_cards.py --profiles .local/card-profiles.json --output .local/output/pdf
```

依存：ReportLab、pypdf、PyMuPDF、Pillow、qrcode 8.2、zxing-cpp 3.1.1。Windowsのメイリオを埋め込み。TrimBoxは91×55mm、MediaBox/BleedBoxは97×61mm、CMYKのKのみ。PDF/X-1a適合を保証するものではなく、印刷会社のスタッフチェックを前提にする。

3PDFの表示・文字配置・フォント埋め込み、300dpiの仕上がりサイズ画像からのQR復号とURL一致、SHA256を確認。証跡は `.local/output/pdf/verification.json`。紙と複数スマートフォンでの実測は未実施。

## 最小ロット比較・注文

公式ページ確認日：2026-10-28。注文画面の確定見積ではない。

| 印刷先 | 最小ロット候補 | 掲載価格・今回の判断 |
|---|---|---|
| [グラフィック](https://www.graphic.jp/lineup/business_card) | 10枚×3種類 | 10枚380円〜、送料1カート350円。掲載下限の単純合計1,490円〜。最小枚数優先の第一候補 |
| [ラクスル](https://raksul.com/print/businesscard/) | 通常100枚×3種類 | 紙・納期・色を選んで再見積、送料別。予備を多く持つ場合の比較先 |
| [プリントパック](https://printpac.co.jp/contents/lineup/trial_businesscard/) | キャンペーン100枚×3種類 | 100枚430円・送料込みの掲載。期間・適用条件・3件利用の可否は再確認。単価重視の比較先 |

グラフィックには終了済みキャンペーンの表示もあるため、掲載額で決済しない。候補仕様は通常名刺・オンデマンド・片面モノクロ・マットコート180kg・各10枚・加工なし。異なるデザインは10枚を3件として同じカートへ。[価格選択](https://www.graphic.jp/price/business_card/1_2)・[送料](https://www.graphic.jp/shop_guide/delivery/shipping_fee)を確認する。

作成PDFは[専用PDF入稿](https://www.graphic.jp/pdf_upload/faq)へ適合未確認。Web入稿・スタッフチェックで寸法・フォントを確認する。QRの余白は[デンソーウェーブ](https://www.qrcode.com/howto/code.html)に基づく。

注文前に必要なこと：

1. ①独自ドメイン接続、3URLの最終照合。
2. 仮名・窓口準備中のまま印刷するかを見本で決定。
3. 実寸印刷・複数スマートフォンで文字とQRを確認。
4. 3件の仕様・税込送料込み総額・納期・配送先・支払方法を注文画面で確定。
5. 具体的条件をユーザーが確認した後に注文・決済し、注文番号と入稿チェック結果を保存。

注文・決済・印刷会社へのアップロードは未実施。仮データでの制作許可は購入条件の確定ではない。接続可能なブラウザーがなく、カート内の確定額・配送先を確認できていない。
