import * as vscode from 'vscode';
import { TranslationCache } from './translationCache';
import { logger } from './logger';

export class InlineTranslationProvider {
    private decorationType: vscode.TextEditorDecorationType;
    private cache: TranslationCache;
    private decorations = new Map<string, vscode.DecorationOptions[]>();

    constructor(cache: TranslationCache) {
        this.cache = cache;

        // Create decoration type for inline translations
        this.decorationType = vscode.window.createTextEditorDecorationType({
            after: {
                color: new vscode.ThemeColor('editorCodeLens.foreground'),
                fontStyle: 'italic',
                margin: '0 0 0 2em'
            },
            isWholeLine: false
        });
    }

    /**
     * Update inline translations for a document
     */
    async updateInlineTranslations(
        document: vscode.TextDocument,
        blocks: Array<{ text: string; range: vscode.Range }>
    ): Promise<void> {
        const fileKey = document.uri.toString();
        const decorations: vscode.DecorationOptions[] = [];

        logger.debug(`Updating inline translations for ${blocks.length} blocks`);

        for (const block of blocks) {
            const translation = this.cache.get(block.text);
            if (translation) {
                // Add decoration at the end of the docstring range
                const decoration: vscode.DecorationOptions = {
                    range: new vscode.Range(block.range.end, block.range.end),
                    renderOptions: {
                        after: {
                            contentText: ` ┆ ${translation.replace(/\n/g, ' ')}`,
                            color: new vscode.ThemeColor('editorCodeLens.foreground'),
                            fontStyle: 'italic'
                        }
                    }
                };
                decorations.push(decoration);
            }
        }

        // Store decorations for this file
        this.decorations.set(fileKey, decorations);

        // Apply decorations to visible editors
        this.applyDecorationsToVisibleEditors(document);

        logger.info(`Applied ${decorations.length} inline translations`);
    }

    /**
     * Apply decorations to all visible editors showing this document
     */
    private applyDecorationsToVisibleEditors(document: vscode.TextDocument): void {
        const fileKey = document.uri.toString();
        const decorations = this.decorations.get(fileKey) || [];

        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.toString() === fileKey) {
                editor.setDecorations(this.decorationType, decorations);
            }
        }
    }

    /**
     * Clear inline translations for a file
     */
    clearFileDecorations(uri: vscode.Uri): void {
        const fileKey = uri.toString();
        this.decorations.delete(fileKey);

        // Clear decorations from visible editors
        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.toString() === fileKey) {
                editor.setDecorations(this.decorationType, []);
            }
        }

        logger.debug(`Cleared inline translations for: ${uri.fsPath}`);
    }

    /**
     * Clear all inline translations
     */
    clearAllDecorations(): void {
        this.decorations.clear();

        // Clear from all visible editors
        for (const editor of vscode.window.visibleTextEditors) {
            editor.setDecorations(this.decorationType, []);
        }

        logger.info('Cleared all inline translations');
    }

    /**
     * Refresh decorations for visible editors (called when editor changes)
     */
    refreshVisibleEditors(): void {
        for (const editor of vscode.window.visibleTextEditors) {
            const fileKey = editor.document.uri.toString();
            const decorations = this.decorations.get(fileKey) || [];
            editor.setDecorations(this.decorationType, decorations);
        }
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.decorationType.dispose();
    }
}
