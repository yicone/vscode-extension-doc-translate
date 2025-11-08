# Contributing to Doc Translate

このドキュメントは、Doc Translate VSCode拡張機能の開発に貢献するためのガイドです。

## 目次

- [開発環境のセットアップ](#開発環境のセットアップ)
- [プロジェクト構造](#プロジェクト構造)
- [開発ワークフロー](#開発ワークフロー)
- [テスト](#テスト)
- [コーディング規約](#コーディング規約)
- [新機能の追加](#新機能の追加)
  - [新しいプログラミング言語のサポート](#新しいプログラミング言語のサポート)
  - [新しいLLMプロバイダーのサポート](#新しいllmプロバイダーのサポート)
- [デバッグ](#デバッグ)
- [リリースプロセス](#リリースプロセス)

## 開発環境のセットアップ

### 必要要件

- **Node.js**: v16以上
- **npm**: v7以上
- **VSCode**: v1.80以上
- **Git**: 最新版

### インストール

1. リポジトリをクローン：
```bash
git clone https://github.com/yourusername/vscode-extension-doc-translate.git
cd vscode-extension-doc-translate
```

2. 依存関係をインストール：
```bash
npm install
```

3. コンパイル：
```bash
npm run compile
```

4. APIキーを設定（テスト用）：
```bash
# いずれか1つ以上を設定
export ANTHROPIC_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
export GEMINI_API_KEY="your-key-here"
```

## プロジェクト構造

```
vscode-extension-doc-translate/
├── src/
│   ├── extension.ts                 # エントリーポイント
│   ├── providers/                   # 翻訳プロバイダー
│   │   ├── base/
│   │   │   ├── translationProvider.ts
│   │   │   └── baseProvider.ts
│   │   ├── anthropicProvider.ts
│   │   ├── openaiProvider.ts
│   │   ├── geminiProvider.ts
│   │   └── translationProviderFactory.ts
│   ├── detectors/                   # ブロック検出器
│   │   ├── base/
│   │   │   ├── blockDetector.ts
│   │   │   └── baseDetector.ts
│   │   ├── pythonBlockDetector.ts
│   │   ├── javascriptBlockDetector.ts
│   │   ├── goBlockDetector.ts
│   │   └── blockDetectorFactory.ts
│   ├── services/                    # コアサービス
│   │   ├── preTranslationService.ts
│   │   ├── inlineTranslationProvider.ts
│   │   └── translationCache.ts
│   ├── utils/                       # ユーティリティ
│   │   ├── logger.ts
│   │   ├── config.ts
│   │   ├── constants.ts
│   │   ├── retryHelper.ts
│   │   ├── languageDetector.ts
│   │   └── commentFormatter.ts
│   └── test/                        # テスト
│       ├── *.test.ts
│       └── assets/
├── docs/                            # ドキュメント
│   ├── ARCHITECTURE.md
│   └── CONTRIBUTING.md
├── package.json
├── tsconfig.json
└── README.md
```

詳細なアーキテクチャ情報は [ARCHITECTURE.md](./ARCHITECTURE.md) を参照してください。

## 開発ワークフロー

### 1. 機能ブランチの作成

```bash
git checkout -b feature/your-feature-name
```

### 2. コード変更

変更を加えたら、自動コンパイルを有効にすると便利です：

```bash
npm run watch
```

これにより、ファイルを保存するたびに自動的にコンパイルされます。

### 3. テストの実行

```bash
npm test
```

特定のテストファイルのみ実行：

```bash
npm test -- --grep "LanguageDetector"
```

### 4. 拡張機能のデバッグ

1. VSCodeでプロジェクトを開く
2. `F5` キーを押す（または「実行」→「デバッグの開始」）
3. 新しいVSCodeウィンドウが開き、拡張機能が読み込まれます
4. テスト用のPython/JS/TS/Goファイルを開いて動作確認

デバッグ時は、`src/utils/logger.ts` を活用してログを出力すると便利です：

```typescript
import { logger } from './utils/logger';

logger.info('Info message');
logger.debug('Debug message');
logger.error('Error message', error);
```

ログは「表示」→「出力」→「Doc Translate」で確認できます。

## テスト

### テストの構成

- **Unit Tests**: 各コンポーネントの単体テスト（87テスト）
  - `baseDetector.test.ts`: BaseBlockDetectorの共通メソッド
  - `languageDetector.test.ts`: 言語検出（10言語以上）
  - `commentFormatter.test.ts`: 言語固有フォーマット
  - `translationCache.test.ts`: キャッシュCRUD・永続化
  - `config.test.ts`: 設定管理

### テストの書き方

新しいテストは `src/test/` に配置します。既存のテストを参考にしてください：

```typescript
import * as assert from 'assert';
import { YourClass } from '../path/to/YourClass';

suite('YourClass Test Suite', () => {
    test('should do something', () => {
        const instance = new YourClass();
        const result = instance.method();
        assert.strictEqual(result, expectedValue);
    });
});
```

### テストカバレッジ

主要なコンポーネントは必ずテストを書いてください：
- 新しいプロバイダー（anthropicProvider.ts など）
- 新しい検出器（pythonBlockDetector.ts など）
- ユーティリティ関数（languageDetector.ts, commentFormatter.ts など）

## CI/CD

### 継続的インテグレーション

このプロジェクトはGitHub Actionsを使用してCIを実行しています。

**CIワークフロー** (`.github/workflows/ci.yml`):
- **テスト**: Node.js 18.x と 20.x でテストを実行
- **リント**: ESLintでコード品質をチェック
- **ビルド**: 拡張機能パッケージ（.vsix）を作成
- **TypeScriptチェック**: 型エラーをチェック

### CI実行タイミング

- `main` ブランチへのプッシュ
- プルリクエストの作成・更新
- 手動実行（workflow_dispatch）

### ローカルでCIと同じチェックを実行

プッシュ前にローカルで同じチェックを実行することをお勧めします：

```bash
# コンパイルチェック
npm run compile

# リント
npm run lint

# テスト
npm test

# TypeScript型チェック
npx tsc --noEmit

# 拡張機能パッケージング（オプション）
npx vsce package
```

### CIステータス

PRをマージする前に、すべてのCIチェックが通過していることを確認してください：
- ✅ Test on Node.js 18.x
- ✅ Test on Node.js 20.x
- ✅ Lint Code
- ✅ Build Extension Package

CIステータスはREADMEのバッジで確認できます：

[![CI](https://github.com/eycjur/vscode-extension-doc-translate/actions/workflows/ci.yml/badge.svg)](https://github.com/eycjur/vscode-extension-doc-translate/actions/workflows/ci.yml)

## コーディング規約

### TypeScript

- **インデント**: タブ（プロジェクト設定に従う）
- **命名規則**:
  - クラス: `PascalCase` (例: `AnthropicProvider`)
  - メソッド/変数: `camelCase` (例: `translateText`)
  - 定数: `UPPER_SNAKE_CASE` (例: `MAX_CONCURRENT_REQUESTS`)
  - インターフェース: `I` プレフィックス (例: `ITranslationProvider`)
- **型**: 可能な限り型を明示する
- **非同期**: `async/await` を使用（Promiseチェーンは避ける）

### コメント

- **JSDoc**: パブリックメソッドには必ずJSDocを記述
- **インラインコメント**: 複雑なロジックには説明コメントを追加

例：
```typescript
/**
 * Translate text from source language to target language
 * @param text - Text to translate
 * @param targetLang - Target language code (e.g., 'ja', 'en')
 * @returns Translated text
 */
async translate(text: string, targetLang: string): Promise<string> {
    // Implementation
}
```

### エラー処理

- 予期されるエラーはキャッチして適切に処理
- ユーザーに見せるエラーは `logger.notifyError()` または `logger.notifyCriticalError()` を使用
- デバッグ情報は `logger.debug()` または `logger.info()` でログに記録

```typescript
try {
    const result = await riskyOperation();
} catch (error) {
    logger.error('Operation failed', error);
    logger.notifyError('Failed to process request');
    throw error;
}
```

## 新機能の追加

### 新しいプログラミング言語のサポート

新しい言語（例: Rust）をサポートする場合：

#### 1. 検出器の作成

`src/detectors/rustBlockDetector.ts` を作成：

```typescript
import * as vscode from 'vscode';
import { BaseBlockDetector } from './base/baseDetector';
import { IBlockDetector, TextBlock } from './base/blockDetector';

export class RustBlockDetector extends BaseBlockDetector implements IBlockDetector {
    async extractBlock(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<TextBlock | null> {
        // Rust固有の検出ロジックを実装
        // 1. LSPでシンボル取得
        const symbols = await this.getSymbolsFromLSP(document);
        if (!symbols) {
            return null;
        }

        // 2. カーソル位置のシンボルを検索
        const symbol = this.findSymbolAtPosition(symbols, position);
        if (!symbol) {
            return null;
        }

        // 3. ドキュメントコメントを抽出
        // Rustの場合: /// または //! コメント
        // 実装...
    }

    async extractAllBlocks(document: vscode.TextDocument): Promise<TextBlock[]> {
        const blocks: TextBlock[] = [];

        // 1. LSPでシンボル取得
        const symbols = await this.getSymbolsFromLSP(document);
        if (!symbols) {
            return blocks;
        }

        // 2. すべてのシンボルからドキュメントコメントを抽出
        // 実装...

        // 3. インラインコメントを抽出
        // 実装...

        // 4. 重複を排除
        return this.deduplicateBlocks(blocks);
    }
}
```

#### 2. ファクトリーに登録

`src/detectors/blockDetectorFactory.ts` に追加：

```typescript
import { RustBlockDetector } from './rustBlockDetector';

export class BlockDetectorFactory {
    private static detectorCache: Map<string, IBlockDetector> = new Map();

    static getDetector(languageId: string): IBlockDetector | null {
        // ...existing code...

        switch (languageId) {
            // ...existing cases...
            case 'rust':
                detector = new RustBlockDetector();
                break;
            // ...
        }
    }

    static isLanguageSupported(languageId: string): boolean {
        const supportedLanguages = ConfigManager.getSupportedLanguages();
        return supportedLanguages.includes(languageId);
    }
}
```

#### 3. コメントフォーマットの追加

`src/utils/commentFormatter.ts` に追加：

```typescript
export function getCommentFormat(languageId: string): CommentFormat {
    switch (languageId) {
        // ...existing cases...
        case 'rust':
            return {
                docstringOpen: '///',
                docstringClose: '',
                lineComment: '//',
                multiLineCommentOpen: '/*',
                multiLineCommentClose: '*/'
            };
        // ...
    }
}
```

#### 4. 設定の更新

`package.json` の `configuration` に追加：

```json
{
    "docTranslate.supportedLanguages": {
        "type": "array",
        "default": ["python", "javascript", "typescript", "go", "rust"],
        "description": "翻訳対象のプログラミング言語"
    }
}
```

#### 5. テストの追加

`src/test/rustBlockDetector.test.ts` を作成し、テストを追加。

#### 6. サンプルファイルの作成

`src/test/assets/sample.rs` を作成してテスト用のサンプルコードを追加。

### 新しいLLMプロバイダーのサポート

新しいLLM（例: Cohere）をサポートする場合：

#### 1. プロバイダーの作成

`src/providers/cohereProvider.ts` を作成：

```typescript
import { BaseProvider } from './base/baseProvider';
import { ITranslationProvider } from './base/translationProvider';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retryHelper';
import { ConfigManager } from '../utils/config';

export class CohereProvider extends BaseProvider implements ITranslationProvider {
    private client: any | null = null;

    constructor() {
        super();
        this.initializeClient();
    }

    private async initializeClient(): Promise<void> {
        const apiKey = ConfigManager.getCohereApiKey();
        if (apiKey) {
            // Cohere SDK のインポートと初期化
            const { CohereClient } = await import('cohere-ai');
            this.client = new CohereClient({ apiKey });
            logger.info('Cohere client initialized successfully');
        } else {
            logger.warn('No Cohere API key found. Client not initialized.');
        }
    }

    async translate(text: string, targetLang: string): Promise<string> {
        logger.info(`Cohere translation request received`);

        // 翻訳が必要かチェック（BaseProviderのメソッド）
        const skipResult = await this.checkTranslationNeeded(text, targetLang);
        if (skipResult !== null) {
            return skipResult;
        }

        if (!this.client) {
            const errorMsg = 'Cohere API key not configured...';
            logger.notifyCriticalError(errorMsg);
            throw new Error(errorMsg);
        }

        // プロンプト構築（BaseProviderのメソッド）
        const prompt = this.buildPrompt(text, targetLang);
        const timeout = ConfigManager.getTimeout();
        const retryConfig = ConfigManager.getRetryConfig();

        try {
            const translation = await withRetry(
                async () => {
                    const response = await this.client.chat({
                        message: prompt,
                        // Cohere固有の設定
                    });
                    return response.text.trim();
                },
                retryConfig,
                'Cohere translation'
            );

            return translation;
        } catch (error: any) {
            logger.notifyError(`Translation failed: ${error.message}`);
            throw error;
        }
    }

    updateConfiguration(): void {
        logger.info('Configuration changed, re-initializing Cohere client');
        this.initializeClient();
    }
}
```

#### 2. ファクトリーに登録

`src/providers/translationProviderFactory.ts` に追加：

```typescript
import { CohereProvider } from './cohereProvider';

export class TranslationProviderFactory {
    private static providerCache: ITranslationProvider | null = null;
    private static currentProvider: LLMProvider | null = null;

    static getProvider(): ITranslationProvider {
        const provider = ConfigManager.getProvider();

        // ...existing code...

        let instance: ITranslationProvider;
        switch (provider) {
            // ...existing cases...
            case 'cohere':
                instance = new CohereProvider();
                break;
            default:
                // ...
        }
    }
}
```

#### 3. 設定の追加

`package.json` に追加：

```json
{
    "configuration": {
        "properties": {
            "docTranslate.provider": {
                "type": "string",
                "enum": ["anthropic", "openai", "gemini", "cohere"],
                "default": "anthropic"
            },
            "docTranslate.cohereApiKey": {
                "type": "string",
                "default": "",
                "description": "Cohere API key"
            },
            "docTranslate.cohereModel": {
                "type": "string",
                "default": "command-r-plus",
                "description": "Cohere model to use"
            }
        }
    }
}
```

#### 4. ConfigManagerの更新

`src/utils/config.ts` に追加：

```typescript
export class ConfigManager {
    // ...existing code...

    static getCohereApiKey(): string | undefined {
        return process.env.COHERE_API_KEY || this.getConfig<string>('cohereApiKey');
    }

    static getCohereModel(): string {
        return this.getConfig<string>('cohereModel') || DEFAULT_CONFIG.COHERE_MODEL;
    }
}
```

`src/utils/constants.ts` に追加：

```typescript
export const DEFAULT_CONFIG = {
    // ...existing...
    COHERE_MODEL: 'command-r-plus',
};
```

#### 5. 型定義の更新

プロバイダー型に追加：

```typescript
export type LLMProvider = 'anthropic' | 'openai' | 'gemini' | 'cohere';
```

#### 6. テストの追加

`src/test/cohereProvider.test.ts` を作成。

## デバッグ

### ログの活用

デバッグ情報はログに記録します：

```typescript
logger.debug('Detailed debug info', { variable1, variable2 });
logger.info('General information');
logger.warn('Warning message');
logger.error('Error message', error);
```

ログは「表示」→「出力」→「Doc Translate」で確認できます。

### ブレークポイント

1. VSCodeでブレークポイントを設定
2. `F5` キーでデバッグ実行
3. 新しいウィンドウで拡張機能を使用
4. ブレークポイントで停止し、変数を確認

### 問題のトラブルシューティング

#### 翻訳が表示されない

1. ログを確認（「Doc Translate: Show Logs」コマンド）
2. APIキーが正しく設定されているか確認
3. LSPが正しく動作しているか確認（言語拡張機能がインストールされているか）

#### パフォーマンスが遅い

1. キャッシュが正しく動作しているか確認
2. 並列リクエスト数を調整（`MAX_CONCURRENT_REQUESTS`）
3. タイムアウト設定を確認

## リリースプロセス

### 1. バージョン更新

`package.json` のバージョンを更新：

```json
{
    "version": "0.5.2"
}
```

### 2. CHANGELOGの更新

`README.md` のリリースノートセクションに新しいバージョンを追加。

### 3. コミット

```bash
git add .
git commit -m "Bump version to 0.5.2"
git tag v0.5.2
git push origin main --tags
```

### 4. パッケージング

```bash
vsce package
```

### 5. 公開

VSCode Marketplaceに公開：

```bash
vsce publish
```

## 質問・サポート

- **Issues**: GitHubのIssuesで質問や問題を報告
- **Discussions**: 機能提案や一般的な議論はDiscussionsで
- **ドキュメント**: [ARCHITECTURE.md](./ARCHITECTURE.md)でアーキテクチャの詳細を確認

---

貢献いただきありがとうございます！🎉
