import { logger } from '../../utils/logger';
import { isTranslationNeeded } from '../../utils/languageDetector';
import { LANGUAGE_NAMES } from '../../utils/constants';

/**
 * Base class for translation providers
 */
export abstract class BaseProvider {
    /**
     * Build translation prompt
     */
    protected buildPrompt(text: string, targetLang: string): string {
        const targetLanguage = LANGUAGE_NAMES[targetLang] || targetLang;

        return `You are a translation assistant specialized in software engineering context.
Translate the given text into natural ${targetLanguage}.

Rules:

Preserve technical terms (library names, function names, class names, variable names) as they are.

Prefer natural ${targetLanguage} rather than literal translation.

Output ONLY the translated ${targetLanguage} text. No explanation.

Translate this text:
${text}`;
    }

    /**
     * Check if translation is needed and return original text if not
     */
    protected async checkTranslationNeeded(text: string, targetLang: string): Promise<string | null> {
        if (!await isTranslationNeeded(text, targetLang)) {
            logger.info('Translation not needed, returning original text');
            return text;
        }
        return null;
    }

    /**
     * Abstract method to be implemented by concrete providers
     */
    abstract translate(text: string, targetLang: string): Promise<string>;

    /**
     * Abstract method to update configuration
     */
    abstract updateConfiguration(): void;
}
