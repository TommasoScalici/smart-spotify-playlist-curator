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
        const status = this.getHttpStatus(error);

        if (status === 401 && onUnauthorized) {
          logger.warn('Spotify Unauthorized (401). Attempting token refresh...');
          await onUnauthorized();
          continue;
        }

        if (status === 429) {
          const retryAfter = this.getRetryAfter(error);
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

  private getHttpStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    // Safe property access
    const e = error as Record<string, unknown>;
    if (typeof e.status === 'number') return e.status;
    if (typeof e.statusCode === 'number') return e.statusCode;
    if (
      typeof e.response === 'object' &&
      e.response &&
      'status' in e.response &&
      typeof (e.response as Record<string, unknown>).status === 'number'
    ) {
      return (e.response as Record<string, unknown>).status as number;
    }
    return undefined;
  }

  private getRetryAfter(error: unknown): number {
    if (typeof error !== 'object' || error === null) return 2;
    const e = error as { headers?: unknown };

    if (!e.headers || typeof e.headers !== 'object') return 2;

    const headers = e.headers as Record<string, unknown>;

    // Handle Headers object (Fetch API) or plain object (Axios/other)
    let value: unknown;
    if ('get' in headers && typeof headers.get === 'function') {
      value = (headers.get as (k: string) => null | string)('retry-after');
    } else if ('retry-after' in headers) {
      value = headers['retry-after'];
    }

    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 2 : parsed;
    }
    return 2;
  }
}
