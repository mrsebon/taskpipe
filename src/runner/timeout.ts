import { StepConfig } from '../config/schema';

export interface TimeoutOptions {
  timeoutMs: number;
  stepName: string;
}

export class TimeoutError extends Error {
  constructor(stepName: string, timeoutMs: number) {
    super(`Step "${stepName}" timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout. Rejects with TimeoutError if the promise
 * does not resolve within the specified number of milliseconds.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeoutMs, stepName } = options;

  if (timeoutMs <= 0) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(stepName, timeoutMs));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Parses a timeout value from a step config.
 * Accepts values like "30s", "2m", "500ms", or a plain number (milliseconds).
 */
export function parseTimeoutMs(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;

  const match = value.match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/);
  if (!match) {
    throw new Error(`Invalid timeout format: "${value}". Use e.g. "30s", "2m", "500ms".`);
  }

  const amount = parseFloat(match[1]);
  const unit = match[2] ?? 'ms';

  switch (unit) {
    case 'ms': return Math.round(amount);
    case 's':  return Math.round(amount * 1_000);
    case 'm':  return Math.round(amount * 60_000);
    default:   return Math.round(amount);
  }
}
