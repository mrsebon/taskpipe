import { Logger } from 'winston';
import { PipelineConfig, Step } from '../config/schema';
import { runHooks, HookDefinition } from './hooks';
import { buildEnvContext, interpolateEnv } from './env';

export function evaluateCondition(
  condition: string,
  env: Record<string, string>
): boolean {
  const interpolated = interpolateEnv(condition, env);
  try {
    // eslint-disable-next-line no-new-func
    return Boolean(new Function('env', `with(env) { return !!(${interpolated}); }`)(env));
  } catch {
    return false;
  }
}

export interface StepRunContext {
  config: PipelineConfig;
  step: Step;
  env: Record<string, string>;
  logger: Logger;
}

export async function runPipelineHooks(
  hooks: HookDefinition[],
  phase: 'before' | 'after' | 'onError',
  env: Record<string, string>,
  logger: Logger
): Promise<void> {
  await runHooks(hooks, phase, env, logger);
}

export function mergeStepEnv(
  pipelineEnv: Record<string, string> | undefined,
  stepEnv: Record<string, string> | undefined,
  processEnv: Record<string, string>
): Record<string, string> {
  return buildEnvContext({
    ...processEnv,
    ...(pipelineEnv ?? {}),
    ...(stepEnv ?? {}),
  });
}

export function shouldSkipStep(
  step: Step,
  env: Record<string, string>,
  logger: Logger
): boolean {
  if (!step.condition) return false;
  const result = evaluateCondition(step.condition, env);
  if (!result) {
    logger.info(`Skipping step '${step.name}' — condition not met: ${step.condition}`);
  }
  return !result;
}
