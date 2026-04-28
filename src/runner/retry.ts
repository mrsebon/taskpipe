import { sleep } from './executor';

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoff?: 'linear' | 'exponential';
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  value: T;
  attempts: number;
  success: boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<RetryResult<T>> {
  const { maxAttempts, delayMs, backoff = 'linear', onRetry } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await fn();
      return { value, attempts: attempt, success: true };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts) {
        onRetry?.(attempt, lastError);

        const delay =
          backoff === 'exponential'
            ? delayMs * Math.pow(2, attempt - 1)
            : delayMs * attempt;

        await sleep(delay);
      }
    }
  }

  throw lastError;
}

export function buildRetryOptions(
  maxAttempts: number,
  delayMs = 1000,
  backoff: 'linear' | 'exponential' = 'linear'
): RetryOptions {
  return { maxAttempts, delayMs, backoff };
}
