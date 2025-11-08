import * as vscode from 'vscode';
import { TranslationCache } from './translationCache';
import { logger } from './logger';

interface DocstringDecorationGroup {
    blockRange: vscode.Range;  // Original docstring block range
    decorations: vscode.DecorationOptions[];  // All decorations for this docstring
}

export class InlineTranslationProvider {
    private commentDecorationType: vscode.TextEditorDecorationType;
    private docstringDecorationType: vscode.TextEditorDecorationType;
    private cache: TranslationCache;
    private commentDecorations = new Map<string, vscode.DecorationOptions[]>();
    private docstringDecorationGroups = new Map<string, DocstringDecorationGroup[]>();

    constructor(cache: TranslationCache) {
        this.cache = cache;

        // Create decoration type for inline comment translations (right side)
        this.commentDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
                color: new vscode.ThemeColor('editorCodeLens.foreground'),
                fontStyle: 'italic',
                margin: '0 0 0 2em'
            },
            isWholeLine: false
        });

        // Create decoration type for docstring translations (overlay/replace)
        this.docstringDecorationType = vscode.window.createTextEditorDecorationType({
            opacity: '0',  // Hide original text
            color: 'transparent',  // Make text color transparent
            isWholeLine: false,
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
        });
    }

    /**
     * Update inline translations for a document
     */
    async updateInlineTranslations(
        document: vscode.TextDocument,
        blocks: Array<{ text: string; range: vscode.Range; type: 'docstring' | 'comment' }>
    ): Promise<void> {
        const fileKey = document.uri.toString();
        const commentDecorations: vscode.DecorationOptions[] = [];
        const docstringGroups: DocstringDecorationGroup[] = [];

        logger.debug(`Updating inline translations for ${blocks.length} blocks`);

        for (const block of blocks) {
            const translation = this.cache.get(block.text);
            if (!translation) {
                continue;
            }

            if (block.type === 'comment') {
                // Comment: display on the right side
                const decoration: vscode.DecorationOptions = {
                    range: new vscode.Range(block.range.end, block.range.end),
                    renderOptions: {
                        after: {
                            contentText: ` → ${translation.replace(/\n/g, ' ')}`,
                            color: new vscode.ThemeColor('editorCodeLens.foreground'),
                            fontStyle: 'italic'
                        }
                    }
                };
                commentDecorations.push(decoration);
            } else {
                // Docstring: hide original and show translation overlay (multi-line)
                const translationLines = translation.split('\n');
                const startLine = block.range.start.line;
                const endLine = block.range.end.line;
                const startCol = block.range.start.character;

                // Create a group for this docstring
                const groupDecorations: vscode.DecorationOptions[] = [];

                // Process each line of the original docstring
                for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
                    const line = document.lineAt(lineNum);
                    const lineRange = new vscode.Range(lineNum, 0, lineNum, line.text.length);

                    // Hide this line
                    const hideLineDecoration: vscode.DecorationOptions = {
                        range: lineRange
                    };
                    groupDecorations.push(hideLineDecoration);
                }

                // Show translation with proper formatting
                // First line: opening quotes + first line of translation
                const firstLineContent = translationLines.length === 1
                    ? `"""${translationLines[0]}"""`
                    : `"""${translationLines[0]}`;

                const firstLineDecoration: vscode.DecorationOptions = {
                    range: new vscode.Range(startLine, 0, startLine, 0),
                    renderOptions: {
                        before: {
                            contentText: ' '.repeat(startCol) + firstLineContent,
                            color: new vscode.ThemeColor('editorCodeLens.foreground'),
                            fontStyle: 'italic'
                        }
                    }
                };
                groupDecorations.push(firstLineDecoration);

                // Middle lines (if multi-line translation)
                if (translationLines.length > 1) {
                    for (let i = 1; i < translationLines.length; i++) {
                        const currentLine = Math.min(startLine + i, endLine);
                        const lineDecoration: vscode.DecorationOptions = {
                            range: new vscode.Range(currentLine, 0, currentLine, 0),
                            renderOptions: {
                                before: {
                                    contentText: ' '.repeat(startCol + 4) + translationLines[i],
                                    color: new vscode.ThemeColor('editorCodeLens.foreground'),
                                    fontStyle: 'italic'
                                }
                            }
                        };
                        groupDecorations.push(lineDecoration);
                    }

                    // Closing quotes on separate line
                    const closeLine = Math.min(startLine + translationLines.length, endLine);
                    const closeDecoration: vscode.DecorationOptions = {
                        range: new vscode.Range(closeLine, 0, closeLine, 0),
                        renderOptions: {
                            before: {
                                contentText: ' '.repeat(startCol) + '"""',
                                color: new vscode.ThemeColor('editorCodeLens.foreground'),
                                fontStyle: 'italic'
                            }
                        }
                    };
                    groupDecorations.push(closeDecoration);
                }

                // Add this group to docstring groups
                docstringGroups.push({
                    blockRange: block.range,
                    decorations: groupDecorations
                });
            }
        }

        // Store decorations for this file
        this.commentDecorations.set(fileKey, commentDecorations);
        this.docstringDecorationGroups.set(fileKey, docstringGroups);

        // Apply decorations to visible editors (with selection filtering)
        this.updateDecorationsForEditor(document);

        logger.info(`Applied ${commentDecorations.length} comment translations and ${docstringGroups.length} docstring groups`);
    }

    /**
     * Update decorations for a document, filtering out decorations that overlap with selections
     */
    private updateDecorationsForEditor(document: vscode.TextDocument): void {
        const fileKey = document.uri.toString();

        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.toString() === fileKey) {
                this.applyDecorationsToEditor(editor);
            }
        }
    }

    /**
     * Apply decorations to an editor, excluding decorations that overlap with selections
     */
    private applyDecorationsToEditor(editor: vscode.TextEditor): void {
        const fileKey = editor.document.uri.toString();
        const commentDecorations = this.commentDecorations.get(fileKey) || [];
        const docstringGroups = this.docstringDecorationGroups.get(fileKey) || [];

        // Filter out docstring groups where cursor/selection overlaps with block range
        const filteredDocstringDecorations = this.filterDocstringGroupsBySelection(
            docstringGroups,
            editor.selections
        );

        editor.setDecorations(this.commentDecorationType, commentDecorations);
        editor.setDecorations(this.docstringDecorationType, filteredDocstringDecorations);
    }

    /**
     * Filter docstring groups by checking if cursor/selection overlaps with block range
     * If cursor is anywhere in a docstring block, exclude all decorations for that block
     */
    private filterDocstringGroupsBySelection(
        groups: DocstringDecorationGroup[],
        selections: readonly vscode.Selection[]
    ): vscode.DecorationOptions[] {
        const result: vscode.DecorationOptions[] = [];

        for (const group of groups) {
            let shouldInclude = true;

            // Check if any selection/cursor overlaps with this docstring block
            for (const selection of selections) {
                // Check for selection range overlap
                if (group.blockRange.intersection(selection)) {
                    shouldInclude = false;
                    break;
                }

                // Check if cursor is inside this docstring block (even without selection)
                if (selection.isEmpty && group.blockRange.contains(selection.active)) {
                    shouldInclude = false;
                    break;
                }
            }

            // If no overlap, include all decorations from this group
            if (shouldInclude) {
                result.push(...group.decorations);
            }
        }

        return result;
    }

    /**
     * Clear inline translations for a file
     */
    clearFileDecorations(uri: vscode.Uri): void {
        const fileKey = uri.toString();
        this.commentDecorations.delete(fileKey);
        this.docstringDecorationGroups.delete(fileKey);

        // Clear decorations from visible editors
        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.toString() === fileKey) {
                editor.setDecorations(this.commentDecorationType, []);
                editor.setDecorations(this.docstringDecorationType, []);
            }
        }

        logger.debug(`Cleared inline translations for: ${uri.fsPath}`);
    }

    /**
     * Clear all inline translations
     */
    clearAllDecorations(): void {
        this.commentDecorations.clear();
        this.docstringDecorationGroups.clear();

        // Clear from all visible editors
        for (const editor of vscode.window.visibleTextEditors) {
            editor.setDecorations(this.commentDecorationType, []);
            editor.setDecorations(this.docstringDecorationType, []);
        }

        logger.info('Cleared all inline translations');
    }

    /**
     * Refresh decorations for visible editors (called when editor or selection changes)
     */
    refreshVisibleEditors(): void {
        for (const editor of vscode.window.visibleTextEditors) {
            this.applyDecorationsToEditor(editor);
        }
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.commentDecorationType.dispose();
        this.docstringDecorationType.dispose();
    }
}
