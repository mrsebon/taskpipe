import { withTimeout, parseTimeoutMs, TimeoutError } from './timeout';

describe('parseTimeoutMs', () => {
  it('returns 0 for undefined', () => {
    expect(parseTimeoutMs(undefined)).toBe(0);
  });

  it('returns numeric value as-is', () => {
    expect(parseTimeoutMs(1500)).toBe(1500);
  });

  it('parses milliseconds suffix', () => {
    expect(parseTimeoutMs('500ms')).toBe(500);
  });

  it('parses seconds suffix', () => {
    expect(parseTimeoutMs('30s')).toBe(30_000);
  });

  it('parses minutes suffix', () => {
    expect(parseTimeoutMs('2m')).toBe(120_000);
  });

  it('parses decimal seconds', () => {
    expect(parseTimeoutMs('1.5s')).toBe(1_500);
  });

  it('defaults to ms when no unit provided', () => {
    expect(parseTimeoutMs('250')).toBe(250);
  });

  it('throws on invalid format', () => {
    expect(() => parseTimeoutMs('abc')).toThrow('Invalid timeout format');
  });
});

describe('withTimeout', () => {
  it('resolves when promise completes before timeout', async () => {
    const fast = Promise.resolve('ok');
    const result = await withTimeout(fast, { timeoutMs: 1_000, stepName: 'test' });
    expect(result).toBe('ok');
  });

  it('rejects with TimeoutError when promise exceeds timeout', async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 200));
    await expect(
      withTimeout(slow, { timeoutMs: 50, stepName: 'slow-step' })
    ).rejects.toThrow(TimeoutError);
  });

  it('TimeoutError message contains step name and duration', async () => {
    const slow = new Promise<void>((resolve) => setTimeout(resolve, 200));
    try {
      await withTimeout(slow, { timeoutMs: 50, stepName: 'my-step' });
    } catch (err) {
      expect(err).toBeInstanceOf(TimeoutError);
      expect((err as TimeoutError).message).toContain('my-step');
      expect((err as TimeoutError).message).toContain('50ms');
    }
  });

  it('propagates underlying rejection', async () => {
    const failing = Promise.reject(new Error('cmd failed'));
    await expect(
      withTimeout(failing, { timeoutMs: 1_000, stepName: 'fail-step' })
    ).rejects.toThrow('cmd failed');
  });

  it('skips timeout when timeoutMs is 0', async () => {
    const p = Promise.resolve('no timeout');
    const result = await withTimeout(p, { timeoutMs: 0, stepName: 'step' });
    expect(result).toBe('no timeout');
  });
});
