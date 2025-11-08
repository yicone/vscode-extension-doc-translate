import { logger } from './logger';

/**
 * Retry configuration
 */
export interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2
};

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: any): boolean {
    if (!error) {
        return false;
    }

    // Check for common rate limit indicators
    const errorString = error.toString().toLowerCase();
    const messageString = (error.message || '').toLowerCase();
    const statusCode = error.status || error.statusCode || error.code;

    // HTTP 429 status code
    if (statusCode === 429 || statusCode === '429') {
        return true;
    }

    // Common rate limit error messages
    const rateLimitKeywords = [
        'rate limit',
        'rate_limit',
        'too many requests',
        'quota exceeded',
        'resource exhausted',
        'throttle',
        'throttled'
    ];

    return rateLimitKeywords.some(keyword =>
        errorString.includes(keyword) || messageString.includes(keyword)
    );
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
    if (!error) {
        return false;
    }

    // Rate limit errors are always retryable
    if (isRateLimitError(error)) {
        return true;
    }

    const statusCode = error.status || error.statusCode || error.code;

    // Retryable HTTP status codes
    const retryableStatuses = [
        408, // Request Timeout
        429, // Too Many Requests
        500, // Internal Server Error
        502, // Bad Gateway
        503, // Service Unavailable
        504  // Gateway Timeout
    ];

    return retryableStatuses.includes(statusCode);
}

/**
 * Calculate delay for retry with exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelayMs);
}

/**
 * Execute a function with retry logic
 * @param fn The async function to execute
 * @param config Retry configuration
 * @param context Context string for logging
 * @returns The result of the function
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    context: string = 'Operation'
): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            // Execute the function
            const result = await fn();

            // Log success if this was a retry
            if (attempt > 0) {
                logger.info(`${context} succeeded after ${attempt} retries`);
            }

            return result;
        } catch (error: any) {
            lastError = error;

            // Check if we should retry
            const isRetryable = isRetryableError(error);
            const isLastAttempt = attempt === config.maxRetries;

            if (!isRetryable || isLastAttempt) {
                // Don't retry for non-retryable errors or last attempt
                if (isRetryable && isLastAttempt) {
                    logger.error(`${context} failed after ${config.maxRetries} retries`, error);
                } else {
                    logger.error(`${context} failed with non-retryable error`, error);
                }
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = calculateDelay(attempt, config);

            // Log retry attempt
            const isRateLimit = isRateLimitError(error);
            const errorType = isRateLimit ? 'rate limit' : 'retryable';
            logger.warn(
                `${context} failed with ${errorType} error (attempt ${attempt + 1}/${config.maxRetries + 1}). ` +
                `Retrying in ${delay}ms...`
            );

            // Wait before retrying
            await sleep(delay);
        }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
}

/**
 * Add jitter to delay to avoid thundering herd problem
 */
export function addJitter(delay: number, jitterFactor: number = 0.1): number {
    const jitter = delay * jitterFactor * (Math.random() - 0.5) * 2;
    return Math.max(0, delay + jitter);
}
