# Doc Translate

PythonコードのdocstringやコメントをClaude APIで日本語に翻訳するVSCode拡張機能です。

## 機能

- **インライン翻訳表示**: Pythonファイルを開くと、docstringの翻訳がコード内に半透明で常時表示
  - ホバー不要、常に表示されている
  - グレーアウトされた斜体で表示、邪魔にならない
  - ファイルは変更されない（見た目のみの変更）
- **ファイルを開くだけで自動翻訳**: Pythonファイルを開くと、すべてのdocstringを自動的にバックグラウンドで翻訳
  - ステータスバーに進捗表示
  - スマートキャッシング: ファイルごとに1回のみ翻訳
  - ファイル保存時も自動再翻訳（キャッシュを活用）
- **LSP駆動の検出**: VSCodeのLanguage Server Protocol (Pylance)を使用した正確なPython構文解析
- **Docstring専用**: docstringのみを翻訳（`"""`と`'''`の両方）- LSPシンボル解析による検出
- **翻訳キャッシュ**: メモリ内キャッシュでAPI呼び出しを最小化
- **進捗インジケーター**: 翻訳中はステータスバーに進捗を表示
- **詳細なログ**: LSPクエリ、APIリクエスト/レスポンス、デバッグ情報を記録
- **設定可能**: 環境変数とVSCode設定の両方に対応

## 必要要件

- **Anthropic APIキー**: この拡張機能を使用するにはAnthropicのAPIキーが必要です
  - `ANTHROPIC_API_KEY` 環境変数を設定（推奨）、または
  - VSCode設定で `docTranslate.anthropicApiKey` を設定
- **Python拡張機能**: LSPベースのdocstring検出にはVSCodeのPython拡張機能（Pylance付き）が必要

## 拡張機能の設定

この拡張機能は以下の設定項目を提供します：

* `docTranslate.anthropicApiKey`: Claude翻訳用のAnthropic APIキー（環境変数 `ANTHROPIC_API_KEY` が優先されます）
* `docTranslate.model`: 翻訳に使用するClaudeモデル（デフォルト: `claude-haiku-4-5-20251001`）
* `docTranslate.timeout`: APIリクエストのタイムアウト（ミリ秒、デフォルト: `30000`）

## 使い方

1. Anthropic APIキーを設定:
   - **方法1（推奨）**: 環境変数 `ANTHROPIC_API_KEY` を設定
   - **方法2**: VSCode設定で `docTranslate.anthropicApiKey` を設定

2. Pythonファイルを開く
   - 拡張機能が自動的にバックグラウンドですべてのdocstringを翻訳開始
   - ステータスバーで進捗を確認: `$(sync~spin) Translating X/Y blocks...`
   - 完了時: `$(check) Translated X blocks`

3. 翻訳を確認
   - docstringの下に半透明の斜体で日本語訳が**常時表示**されます
   - ホバー不要、常に見える状態
   - 元のコードは一切変更されません（見た目のみ）

4. ファイルを編集・保存
   - ファイルを保存すると自動的に再翻訳されます
   - キャッシュを活用するので、変更されていない部分は高速に処理

## コマンド

* `Doc Translate: Clear Translation Cache`: 翻訳キャッシュと事前翻訳キャッシュをクリア（次回ファイルを開いたときに再翻訳）
* `Doc Translate: Show Logs`: 詳細ログを表示する出力チャンネルを開く

## デバッグ

詳細ログを表示するには：

1. コマンドパレットを開く（`Cmd+Shift+P` または `Ctrl+Shift+P`）
2. `Doc Translate: Show Logs` を実行
3. "Doc Translate" 出力チャンネルに以下の詳細ログが表示されます：
   - 拡張機能の起動状態
   - APIキーの検出
   - 事前翻訳の進捗（ファイルを開いたとき）
   - LSPシンボルのクエリと結果
   - LSPによるdocstring検出
   - 翻訳リクエストとレスポンス
   - キャッシュヒット/ミス
   - エラー詳細

または、出力パネルを手動で開くこともできます：
- 表示 → 出力 → ドロップダウンから "Doc Translate" を選択

## 既知の問題

現時点ではありません。

## リリースノート

### 0.1.0

初回MVPリリース:
- PythonのdocstringとコメントのホバープロバイダーBE
- Claude API統合
- 翻訳キャッシング
- APIキーとモデル設定の設定機能
