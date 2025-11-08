import * as vscode from 'vscode';
import { TranslationProviderFactory } from '../providers/translationProviderFactory';
import { TranslationCache } from './translationCache';
import { BlockDetectorFactory } from '../detectors/blockDetectorFactory';
import { InlineTranslationProvider } from './inlineTranslationProvider';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/config';

// Maximum number of concurrent translation requests
const MAX_CONCURRENT_REQUESTS = 5;

export class PreTranslationService {
    private cache: TranslationCache;
    private inlineProvider: InlineTranslationProvider;
    private statusBarItem: vscode.StatusBarItem;
    private activeTranslations = new Map<string, Promise<void>>();

    constructor(cache: TranslationCache, inlineProvider: InlineTranslationProvider) {
        this.cache = cache;
        this.inlineProvider = inlineProvider;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }

    /**
     * Pre-translate all docstrings and comments in a document
     * Always runs - uses cache when available, translates when not
     */
    async preTranslateDocument(document: vscode.TextDocument): Promise<void> {
        // Only process supported languages
        if (!BlockDetectorFactory.isLanguageSupported(document.languageId)) {
            return;
        }

        const fileKey = document.uri.toString();

        // If already translating this file, wait for it
        const existingTranslation = this.activeTranslations.get(fileKey);
        if (existingTranslation) {
            logger.debug(`Translation already in progress for: ${document.fileName}, waiting...`);
            await existingTranslation;
            return;
        }

        // Create translation promise
        const translationPromise = this.performTranslation(document);
        this.activeTranslations.set(fileKey, translationPromise);

        try {
            await translationPromise;
        } finally {
            this.activeTranslations.delete(fileKey);
        }
    }

    /**
     * Perform translation for a document
     */
    private async performTranslation(document: vscode.TextDocument): Promise<void> {
        logger.info('='.repeat(60));
        logger.info(`Translating: ${document.fileName}`);
        logger.info('='.repeat(60));

        try {
            // Extract all translatable blocks
            const blocks = await this.extractAllBlocks(document);
            logger.info(`Found ${blocks.length} translatable blocks`);

            if (blocks.length === 0) {
                logger.info('No translatable blocks found');
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
                // Display cached translations
                await this.inlineProvider.updateInlineTranslations(document, blocks);
            } else {
                logger.info(`Translating ${blocksToTranslate.length} blocks with max ${MAX_CONCURRENT_REQUESTS} concurrent requests`);

                // Display cached translations first
                if (cachedCount > 0) {
                    await this.inlineProvider.updateInlineTranslations(document, blocks);
                }

                // Translate blocks in parallel with concurrency limit
                await this.translateBlocksConcurrently(
                    document,
                    blocksToTranslate,
                    blocks,
                    (current, total) => {
                        translated = cachedCount + current;
                        this.statusBarItem.text = `$(sync~spin) Translating ${translated}/${total}...`;
                    }
                );

                translated = blocks.length;
            }

            const duration = Date.now() - startTime;
            logger.info(`Translation completed: ${translated}/${blocks.length} blocks in ${duration}ms`);
            logger.info('='.repeat(60));

            // Show completion message
            this.statusBarItem.text = `$(check) Translated ${translated} blocks`;
            setTimeout(() => this.statusBarItem.hide(), 3000);

        } catch (error) {
            logger.error('Translation failed', error);
            this.statusBarItem.text = `$(error) Translation failed`;
            setTimeout(() => this.statusBarItem.hide(), 3000);
        }
    }

    /**
     * Translate blocks concurrently with a limit on concurrent requests
     * Updates inline translations progressively as each block completes
     */
    private async translateBlocksConcurrently(
        document: vscode.TextDocument,
        blocksToTranslate: Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }>,
        allBlocks: Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }>,
        onProgress: (current: number, total: number) => void
    ): Promise<void> {
        let completed = 0;
        let index = 0;

        // Get translation provider and language settings
        const provider = TranslationProviderFactory.getProvider();
        const targetLang = ConfigManager.getTargetLang();

        // Process blocks in batches
        while (index < blocksToTranslate.length) {
            // Get next batch (up to MAX_CONCURRENT_REQUESTS)
            const batch = blocksToTranslate.slice(index, index + MAX_CONCURRENT_REQUESTS);
            index += batch.length;

            // Translate all blocks in this batch concurrently
            const promises = batch.map(async (block) => {
                try {
                    logger.debug(`Translating block text (${block.text.length} chars): "${block.text.substring(0, 100)}..."`);
                    const translation = await provider.translate(block.text, targetLang);
                    this.cache.set(block.text, translation);
                    completed++;
                    onProgress(completed, allBlocks.length);
                    logger.debug(`Completed ${completed}/${blocksToTranslate.length}`);

                    // Update inline translations progressively after each block completes
                    await this.inlineProvider.updateInlineTranslations(document, allBlocks);
                } catch (error) {
                    logger.error(`Failed to translate block: ${block.text.substring(0, 30)}...`, error);
                    // Continue with next block even if one fails
                }
            });

            // Wait for all translations in this batch to complete
            await Promise.all(promises);
        }

        logger.info(`Concurrent translation completed: ${completed}/${blocksToTranslate.length} blocks translated`);
    }

    /**
     * Extract all translatable blocks from document
     */
    private async extractAllBlocks(document: vscode.TextDocument): Promise<Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }>> {
        // Get the appropriate detector for this language
        const detector = BlockDetectorFactory.getDetector(document.languageId);
        if (!detector) {
            logger.warn(`No detector available for language: ${document.languageId}`);
            return [];
        }

        // Use the detector to extract all blocks
        return await detector.extractAllBlocks(document);
    }

    /**
     * Clear decorations for a file (called when explicitly clearing cache)
     */
    clearFileCache(uri: vscode.Uri): void {
        this.inlineProvider.clearFileDecorations(uri);
        logger.info(`Cleared decorations for: ${uri.fsPath}`);
    }

    /**
     * Clear all decorations
     */
    clearAllCaches(): void {
        this.inlineProvider.clearAllDecorations();
        logger.info('Cleared all decorations');
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.statusBarItem.dispose();
    }
}
