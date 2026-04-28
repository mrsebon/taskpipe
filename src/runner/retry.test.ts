import { withRetry, buildRetryOptions } from './retry';

describe('withRetry', () => {
  it('resolves immediately when fn succeeds on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, buildRetryOptions(3, 0));

    expect(result.value).toBe('ok');
    expect(result.attempts).toBe(1);
    expect(result.success).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds eventually', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail again'))
      .mockResolvedValue('done');

    const result = await withRetry(fn, buildRetryOptions(3, 0));

    expect(result.value).toBe('done');
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(fn, buildRetryOptions(3, 0))).rejects.toThrow(
      'always fails'
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls onRetry callback with attempt number and error', async () => {
    const onRetry = jest.fn();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('err1'))
      .mockResolvedValue('ok');

    await withRetry(fn, { maxAttempts: 3, delayMs: 0, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('applies exponential backoff delays', async () => {
    const delays: number[] = [];
    const sleepSpy = jest
      .spyOn(require('./executor'), 'sleep')
      .mockImplementation((ms: number) => {
        delays.push(ms);
        return Promise.resolve();
      });

    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('e'))
      .mockRejectedValueOnce(new Error('e'))
      .mockResolvedValue('ok');

    await withRetry(fn, { maxAttempts: 3, delayMs: 100, backoff: 'exponential' });

    expect(delays).toEqual([100, 200]);
    sleepSpy.mockRestore();
  });
});
