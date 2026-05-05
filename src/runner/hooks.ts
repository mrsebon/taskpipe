import { execa } from 'execa';
import { Logger } from 'winston';

export type HookPhase = 'before' | 'after' | 'onError';

export interface HookDefinition {
  command: string;
  phase: HookPhase;
  continueOnError?: boolean;
}

export interface HookResult {
  phase: HookPhase;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  skipped: boolean;
}

export async function runHook(
  hook: HookDefinition,
  env: Record<string, string>,
  logger: Logger
): Promise<HookResult> {
  logger.debug(`Running ${hook.phase} hook: ${hook.command}`);

  try {
    const result = await execa('sh', ['-c', hook.command], {
      env: { ...process.env, ...env },
      reject: false,
    });

    const hookResult: HookResult = {
      phase: hook.phase,
      command: hook.command,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      skipped: false,
    };

    if (result.exitCode !== 0 && !hook.continueOnError) {
      logger.warn(`Hook failed (exit ${result.exitCode}): ${hook.command}`);
      throw new Error(`Hook '${hook.command}' exited with code ${result.exitCode}`);
    }

    logger.debug(`Hook completed (exit ${result.exitCode}): ${hook.command}`);
    return hookResult;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Hook '")) throw err;
    logger.error(`Hook execution error: ${hook.command}`, { error: err });
    throw err;
  }
}

export async function runHooks(
  hooks: HookDefinition[],
  phase: HookPhase,
  env: Record<string, string>,
  logger: Logger
): Promise<HookResult[]> {
  const phaseHooks = hooks.filter((h) => h.phase === phase);
  const results: HookResult[] = [];

  for (const hook of phaseHooks) {
    const result = await runHook(hook, env, logger);
    results.push(result);
  }

  return results;
}
