import { logger } from './logger';

/**
 * Map ISO 639-3 codes (returned by franc) to ISO 639-1 codes
 */
const iso6393To6391: { [key: string]: string } = {
    'eng': 'en',  // English
    'jpn': 'ja',  // Japanese
    'cmn': 'zh',  // Chinese (Mandarin)
    'zho': 'zh',  // Chinese
    'kor': 'ko',  // Korean
    'fra': 'fr',  // French
    'deu': 'de',  // German
    'spa': 'es',  // Spanish
    'ita': 'it',  // Italian
    'por': 'pt',  // Portuguese
    'rus': 'ru',  // Russian
    'ara': 'ar',  // Arabic
    'hin': 'hi',  // Hindi
    'vie': 'vi',  // Vietnamese
    'tha': 'th',  // Thai
    'nld': 'nl',  // Dutch
    'pol': 'pl',  // Polish
    'swe': 'sv',  // Swedish
    'nor': 'no',  // Norwegian
    'dan': 'da',  // Danish
    'fin': 'fi',  // Finnish
    'tur': 'tr',  // Turkish
    'heb': 'he',  // Hebrew
    'ukr': 'uk',  // Ukrainian
    'ces': 'cs',  // Czech
    'ron': 'ro',  // Romanian
    'hun': 'hu',  // Hungarian
    'ell': 'el',  // Greek
};

/**
 * Detect the language of the given text
 * @param text Text to detect language from
 * @returns ISO 639-1 language code (e.g., 'en', 'ja'), or 'und' if undetermined
 */
export async function detectLanguage(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
        return 'und';
    }

    try {
        // Dynamic import of franc (ES module)
        const { franc } = await import('franc');

        // franc returns ISO 639-3 codes
        const detected = franc(text, { minLength: 3 });

        logger.debug(`Language detection: "${text.substring(0, 50)}..." -> ${detected}`);

        // franc returns 'und' if language is undetermined
        if (detected === 'und') {
            return 'und';
        }

        // Convert to ISO 639-1 if mapping exists
        const iso6391 = iso6393To6391[detected];
        if (iso6391) {
            logger.debug(`Mapped ${detected} to ${iso6391}`);
            return iso6391;
        }

        // If no mapping exists, return the 3-letter code
        logger.warn(`No ISO 639-1 mapping found for ${detected}, using as-is`);
        return detected;
    } catch (error) {
        logger.error('Language detection failed', error);
        return 'und';
    }
}

/**
 * Check if translation is needed (source and target languages are different)
 * @param text Text to check
 * @param targetLang Target language code
 * @returns true if translation is needed, false otherwise
 */
export async function isTranslationNeeded(text: string, targetLang: string): Promise<boolean> {
    const detectedLang = await detectLanguage(text);

    // If language is undetermined, proceed with translation
    if (detectedLang === 'und') {
        logger.debug('Language undetermined, proceeding with translation');
        return true;
    }

    // Check if detected language matches target language
    const needsTranslation = detectedLang !== targetLang;

    if (!needsTranslation) {
        logger.info(`Skipping translation: text is already in target language (${targetLang})`);
    }

    return needsTranslation;
}
