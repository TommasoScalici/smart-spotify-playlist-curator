import * as logger from 'firebase-functions/logger';

export class SpotifyBaseClient {
  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    onUnauthorized?: () => Promise<void>
  ): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error;
        const status =
          (error as { response?: { status: number }; status?: number; statusCode?: number })
            .status ||
          (error as { statusCode?: number }).statusCode ||
          (error as { response?: { status: number } }).response?.status;

        if (status === 401 && onUnauthorized) {
          logger.warn('Spotify Unauthorized (401). Attempting token refresh...');
          await onUnauthorized();
          continue;
        }

        if (status === 429) {
          let retryAfter = 2;
          const err = error as {
            headers?: { get?: (s: string) => null | string } | Record<string, string>;
          };
          if (err.headers) {
            const headerValue =
              typeof err.headers.get === 'function'
                ? err.headers.get('retry-after')
                : (err.headers as Record<string, string>)['retry-after'];
            if (headerValue) retryAfter = parseInt(headerValue, 10);
          }

          logger.warn(`Spotify Rate Limit (429). Retrying after ${retryAfter}s...`);
          await this.delay(retryAfter * 1000);
          continue;
        }

        if (typeof status === 'number' && status >= 500) {
          const waitTime = Math.pow(2, i) * 500;
          logger.warn(`Spotify Server Error (${status}). Retrying in ${waitTime}ms...`);
          await this.delay(waitTime);
          continue;
        }

        throw error;
      }
    }
    throw lastError;
  }
}
