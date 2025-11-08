import * as vscode from 'vscode';
import { ClaudeClient } from './claudeClient';
import { TranslationCache } from './translationCache';
import { PythonBlockDetector } from './pythonBlockDetector';
import { InlineTranslationProvider } from './inlineTranslationProvider';
import { logger } from './logger';

// Maximum number of concurrent translation requests
const MAX_CONCURRENT_REQUESTS = 5;

export class PreTranslationService {
    private claudeClient: ClaudeClient;
    private cache: TranslationCache;
    private detector: PythonBlockDetector;
    private inlineProvider: InlineTranslationProvider;
    private statusBarItem: vscode.StatusBarItem;
    private isTranslating = false;
    private translatedFiles = new Set<string>();

    constructor(claudeClient: ClaudeClient, cache: TranslationCache, inlineProvider: InlineTranslationProvider) {
        this.claudeClient = claudeClient;
        this.cache = cache;
        this.inlineProvider = inlineProvider;
        this.detector = new PythonBlockDetector();
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }

    /**
     * Pre-translate all docstrings and comments in a document
     */
    async preTranslateDocument(document: vscode.TextDocument): Promise<void> {
        // Only process Python files
        if (document.languageId !== 'python') {
            return;
        }

        // Skip if already translated
        const fileKey = document.uri.toString();
        if (this.translatedFiles.has(fileKey)) {
            logger.info(`File already pre-translated: ${document.fileName}`);
            return;
        }

        // Skip if already translating
        if (this.isTranslating) {
            logger.debug('Pre-translation already in progress, skipping');
            return;
        }

        this.isTranslating = true;
        logger.info('='.repeat(60));
        logger.info(`Starting pre-translation for: ${document.fileName}`);
        logger.info('='.repeat(60));

        try {
            // Extract all translatable blocks
            const blocks = await this.extractAllBlocks(document);
            logger.info(`Found ${blocks.length} translatable blocks`);

            if (blocks.length === 0) {
                this.translatedFiles.add(fileKey);
                return;
            }

            // Show progress in status bar
            this.statusBarItem.text = `$(sync~spin) Translating ${blocks.length} blocks...`;
            this.statusBarItem.show();

            let translated = 0;
            const startTime = Date.now();

            // Filter out already cached blocks
            const blocksToTranslate = blocks.filter(block => !this.cache.get(block.text));
            const cachedCount = blocks.length - blocksToTranslate.length;

            if (cachedCount > 0) {
                logger.info(`${cachedCount} blocks already cached, skipping`);
                translated = cachedCount;
            }

            if (blocksToTranslate.length === 0) {
                logger.info('All blocks already cached, no translation needed');
            } else {
                logger.info(`Translating ${blocksToTranslate.length} blocks with max ${MAX_CONCURRENT_REQUESTS} concurrent requests`);

                // Translate blocks in parallel with concurrency limit
                await this.translateBlocksConcurrently(blocksToTranslate, blocks.length, (current, total) => {
                    translated = cachedCount + current;
                    this.statusBarItem.text = `$(sync~spin) Translating ${translated}/${total}...`;
                });

                translated = blocks.length;
            }

            const duration = Date.now() - startTime;
            logger.info(`Pre-translation completed: ${translated}/${blocks.length} blocks in ${duration}ms`);
            logger.info('='.repeat(60));

            // Mark as translated
            this.translatedFiles.add(fileKey);

            // Update inline translations
            await this.inlineProvider.updateInlineTranslations(document, blocks);

            // Show completion message
            this.statusBarItem.text = `$(check) Translated ${translated} blocks`;
            setTimeout(() => this.statusBarItem.hide(), 3000);

        } catch (error) {
            logger.error('Pre-translation failed', error);
            this.statusBarItem.text = `$(error) Translation failed`;
            setTimeout(() => this.statusBarItem.hide(), 3000);
        } finally {
            this.isTranslating = false;
        }
    }

    /**
     * Translate blocks concurrently with a limit on concurrent requests
     */
    private async translateBlocksConcurrently(
        blocks: Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }>,
        totalBlocks: number,
        onProgress: (current: number, total: number) => void
    ): Promise<void> {
        let completed = 0;
        let index = 0;

        // Process blocks in batches
        while (index < blocks.length) {
            // Get next batch (up to MAX_CONCURRENT_REQUESTS)
            const batch = blocks.slice(index, index + MAX_CONCURRENT_REQUESTS);
            index += batch.length;

            // Translate all blocks in this batch concurrently
            const promises = batch.map(async (block) => {
                try {
                    logger.debug(`Translating block text (${block.text.length} chars): "${block.text.substring(0, 100)}..."`);
                    const translation = await this.claudeClient.translate(block.text);
                    this.cache.set(block.text, translation);
                    completed++;
                    onProgress(completed, totalBlocks);
                    logger.debug(`Completed ${completed}/${blocks.length}`);
                } catch (error) {
                    logger.error(`Failed to translate block: ${block.text.substring(0, 30)}...`, error);
                    // Continue with next block even if one fails
                }
            });

            // Wait for all translations in this batch to complete
            await Promise.all(promises);
        }

        logger.info(`Concurrent translation completed: ${completed}/${blocks.length} blocks translated`);
    }

    /**
     * Extract all translatable blocks from document
     */
    private async extractAllBlocks(document: vscode.TextDocument): Promise<Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }>> {
        const blocks: Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }> = [];

        // 1. Extract module-level docstring (file top-level)
        const moduleDocstring = this.detector.extractModuleDocstring(document);
        if (moduleDocstring && moduleDocstring.text.trim()) {
            blocks.push({ text: moduleDocstring.text, range: moduleDocstring.range, type: 'docstring' });
            logger.debug(`Extracted module docstring: ${moduleDocstring.text.substring(0, 30)}...`);
        }

        // 2. Extract docstrings via LSP
        try {
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            );

            if (symbols && symbols.length > 0) {
                await this.extractDocstringsFromSymbols(document, symbols, blocks);
            }
        } catch (error) {
            logger.error('Failed to get symbols from LSP', error);
        }

        // 3. Extract inline comments
        this.extractInlineComments(document, blocks);

        // Deduplicate blocks by text
        const uniqueBlocks = this.deduplicateBlocks(blocks);
        logger.debug(`Extracted ${blocks.length} blocks (${uniqueBlocks.filter(b => b.type === 'docstring').length} docstrings, ${uniqueBlocks.filter(b => b.type === 'comment').length} comments), ${uniqueBlocks.length} unique`);

        return uniqueBlocks;
    }

    /**
     * Recursively extract docstrings from symbols
     */
    private async extractDocstringsFromSymbols(
        document: vscode.TextDocument,
        symbols: vscode.DocumentSymbol[],
        blocks: Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }>
    ): Promise<void> {
        for (const symbol of symbols) {
            // Try to extract docstring for this symbol
            const symbolBodyStart = symbol.selectionRange.end.line + 1;
            if (symbolBodyStart < document.lineCount) {
                const docstring = this.detector.extractDocstringFromLine(document, symbolBodyStart);
                if (docstring && docstring.text.trim()) {
                    blocks.push({ text: docstring.text, range: docstring.range, type: 'docstring' });
                    logger.debug(`Extracted docstring from ${symbol.name}: ${docstring.text.substring(0, 30)}...`);
                }
            }

            // Recursively process children
            if (symbol.children && symbol.children.length > 0) {
                await this.extractDocstringsFromSymbols(document, symbol.children, blocks);
            }
        }
    }

    /**
     * Extract all inline comments from document
     */
    private extractInlineComments(
        document: vscode.TextDocument,
        blocks: Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }>
    ): void {
        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            const comment = this.detector.extractInlineComment(document, lineNum);
            if (comment && comment.text.trim()) {
                blocks.push({ text: comment.text, range: comment.range, type: 'comment' });
                logger.debug(`Extracted comment at line ${lineNum}: ${comment.text.substring(0, 30)}...`);
            }
        }
    }

    /**
     * Deduplicate blocks by text content
     */
    private deduplicateBlocks(blocks: Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }>): Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }> {
        const seen = new Map<string, { text: string; range: vscode.Range; type: 'docstring' | 'comment' }>();
        for (const block of blocks) {
            if (!seen.has(block.text)) {
                seen.set(block.text, block);
            }
        }
        return Array.from(seen.values());
    }

    /**
     * Clear pre-translation cache for a file
     */
    clearFileCache(uri: vscode.Uri): void {
        const fileKey = uri.toString();
        this.translatedFiles.delete(fileKey);
        this.inlineProvider.clearFileDecorations(uri);
        logger.info(`Cleared pre-translation cache for: ${uri.fsPath}`);
    }

    /**
     * Clear all pre-translation caches
     */
    clearAllCaches(): void {
        this.translatedFiles.clear();
        this.inlineProvider.clearAllDecorations();
        logger.info('Cleared all pre-translation caches');
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.statusBarItem.dispose();
    }
}
