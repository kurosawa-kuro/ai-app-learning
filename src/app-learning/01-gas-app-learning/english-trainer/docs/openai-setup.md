# OpenAI API接続（現在の方式）

2026-10-28の利用者指定でGemini／GCP OAuth方式から変更。各自のOpenAI APIキーを使用する。ChatGPTの月額契約とは別のAPI課金となる。

- 写真日記：日記を書く → AI接続設定（OpenAI）→ キーを保存。
- 英語：設定 → OpenAI APIキーを入力 → AIを使うをオン → 保存。
- 保存先は本人のGASのScript Properties `OPENAI_API_KEY`。画面に保存済みキーを返さない。キーを消す操作も用意する。
- モデルは `gpt-4.1-mini`。Responses APIを使い、`store:false`、構造化JSON出力、送信上限を設定する。画像は日記で選択したものだけを送る。
- Googleへの初回GAS権限承認は必要。AIのためにGCPプロジェクトを作成したりOAuthのスコープを追加する必要はない。
- 既存のSheets／Drive／日記・学習履歴は保持する。再初期化やキーのコード埋込みは不要。
- 失敗時は入力を保持し、自動で繰り返し課金する再送を行わない。API未設定・利用枠不足は成功扱いしない。

[OpenAI API公式クイックスタート](https://developers.openai.com/api/docs/quickstart)、[画像入力](https://developers.openai.com/api/docs/guides/images-vision)、[構造化出力](https://developers.openai.com/api/docs/guides/structured-outputs)。

## 秘密情報の検証手順

キーを含むPlaywrightコードはツールの応答で再掲される場合がある。応答保存・表示の前にキーを伏せ、キー入りの一時要求ファイルを残さない。伏せ処理が成功したことを先に確認し、失敗した処理の後に送信を続行しない。2026-10-28に伏せ処理の失敗後も送信してしまいツール出力へキーが出たため、該当キーの失効・再発行が必要。
