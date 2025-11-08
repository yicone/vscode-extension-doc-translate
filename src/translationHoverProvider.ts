import * as vscode from 'vscode';
import { ClaudeClient } from './claudeClient';
import { TranslationCache } from './translationCache';
import { PythonBlockDetector } from './pythonBlockDetector';
import { logger } from './logger';

export class TranslationHoverProvider implements vscode.HoverProvider {
    public claudeClient: ClaudeClient;
    public cache: TranslationCache;
    private detector: PythonBlockDetector;

    constructor() {
        logger.info('Initializing TranslationHoverProvider');
        this.claudeClient = new ClaudeClient();
        this.cache = new TranslationCache();
        this.detector = new PythonBlockDetector();
    }

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | null> {
        logger.info(`Hover triggered at ${document.fileName}:${position.line}:${position.character}`);

        // Extract text block at cursor position
        const block = await this.detector.extractBlock(document, position);
        if (!block || !block.text) {
            logger.debug('No translatable block found, skipping hover');
            return null;
        }

        logger.debug(`Hover block text (${block.text.length} chars): "${block.text.substring(0, 100)}..."`);

        // Get translation from cache only (no on-demand translation)
        const translation = this.cache.get(block.text);

        if (translation) {
            logger.info('Translation found in cache');
            logger.debug('Cached translation:', { translation: translation.substring(0, 50) + '...' });

            // Create hover content
            const markdown = new vscode.MarkdownString();
            markdown.appendCodeblock(translation, 'plaintext');

            logger.info('Hover content created successfully');
            return new vscode.Hover(markdown, block.range);
        } else {
            // Not in cache - file hasn't been pre-translated yet or is being translated
            logger.info('Translation not in cache (pre-translation may be in progress)');
            const markdown = new vscode.MarkdownString();
            markdown.appendText('⏳ 事前翻訳中... ファイルを開いた直後は翻訳に時間がかかります');
            return new vscode.Hover(markdown, block.range);
        }
    }

    // Update client configuration (called when settings change)
    updateConfiguration(): void {
        logger.info('Updating configuration');
        this.claudeClient.updateConfiguration();
    }

    // Clear translation cache
    clearCache(): void {
        logger.info(`Clearing translation cache (${this.cache.size} items)`);
        this.cache.clear();
        logger.info('Cache cleared');
    }
}
