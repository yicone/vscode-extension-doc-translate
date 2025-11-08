import * as crypto from 'crypto';
import { logger } from './logger';

export class TranslationCache {
    private cache: Map<string, string> = new Map();

    private hash(text: string): string {
        return crypto.createHash('sha256').update(text).digest('hex');
    }

    get(text: string): string | undefined {
        const key = this.hash(text);
        const result = this.cache.get(key);
        logger.debug(`Cache ${result ? 'HIT' : 'MISS'} for key: ${key.substring(0, 16)}... (text: "${text.substring(0, 50)}...")`);
        return result;
    }

    set(text: string, translation: string): void {
        const key = this.hash(text);
        logger.debug(`Cache SET for key: ${key.substring(0, 16)}... (text: "${text.substring(0, 50)}...")`);
        this.cache.set(key, translation);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}
