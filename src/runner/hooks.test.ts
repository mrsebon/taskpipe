import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runHook, runHooks, HookDefinition } from './hooks';
import { createLogger } from './logger';

const logger = createLogger({ level: 'silent', label: 'test' });

describe('runHook', () => {
  it('runs a successful hook and returns result', async () => {
    const hook: HookDefinition = { command: 'echo hello', phase: 'before' };
    const result = await runHook(hook, {}, logger);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
    expect(result.skipped).toBe(false);
    expect(result.phase).toBe('before');
  });

  it('throws when hook fails and continueOnError is false', async () => {
    const hook: HookDefinition = { command: 'exit 1', phase: 'before', continueOnError: false };
    await expect(runHook(hook, {}, logger)).rejects.toThrow("Hook 'exit 1' exited with code 1");
  });

  it('does not throw when hook fails and continueOnError is true', async () => {
    const hook: HookDefinition = { command: 'exit 2', phase: 'onError', continueOnError: true };
    const result = await runHook(hook, {}, logger);
    expect(result.exitCode).toBe(2);
  });

  it('passes env variables to the hook', async () => {
    const hook: HookDefinition = { command: 'echo $MY_VAR', phase: 'after' };
    const result = await runHook(hook, { MY_VAR: 'testvalue' }, logger);
    expect(result.stdout.trim()).toBe('testvalue');
  });
});

describe('runHooks', () => {
  it('runs only hooks matching the given phase', async () => {
    const hooks: HookDefinition[] = [
      { command: 'echo before', phase: 'before' },
      { command: 'echo after', phase: 'after' },
      { command: 'echo before2', phase: 'before' },
    ];

    const results = await runHooks(hooks, 'before', {}, logger);
    expect(results).toHaveLength(2);
    expect(results[0].stdout.trim()).toBe('before');
    expect(results[1].stdout.trim()).toBe('before2');
  });

  it('returns empty array when no hooks match phase', async () => {
    const hooks: HookDefinition[] = [{ command: 'echo after', phase: 'after' }];
    const results = await runHooks(hooks, 'before', {}, logger);
    expect(results).toHaveLength(0);
  });

  it('stops on first failing hook by default', async () => {
    const hooks: HookDefinition[] = [
      { command: 'exit 1', phase: 'before' },
      { command: 'echo second', phase: 'before' },
    ];
    await expect(runHooks(hooks, 'before', {}, logger)).rejects.toThrow();
  });
});
