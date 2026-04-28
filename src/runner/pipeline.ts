import { runOnce } from './executor';
import { withRetry } from './retry';
import type { PipelineConfig, StepConfig } from '../config/schema';

export interface StepResult {
  stepName: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  attempts: number;
  skipped: boolean;
}

export interface PipelineResult {
  success: boolean;
  steps: StepResult[];
}

export async function runPipeline(
  config: PipelineConfig,
  env: Record<string, string> = {}
): Promise<PipelineResult> {
  const results: StepResult[] = [];
  let previousExitCode = 0;

  for (const step of config.steps) {
    const shouldSkip = evaluateCondition(step, previousExitCode);

    if (shouldSkip) {
      results.push({
        stepName: step.name,
        exitCode: 0,
        stdout: '',
        stderr: '',
        attempts: 0,
        skipped: true,
      });
      continue;
    }

    const maxAttempts = step.retry?.attempts ?? 1;
    const delayMs = step.retry?.delayMs ?? 1000;

    let stepResult: StepResult;

    try {
      const retryResult = await withRetry(
        () => runOnce(step.command, { env }),
        { maxAttempts, delayMs }
      );

      stepResult = {
        stepName: step.name,
        ...retryResult.value,
        attempts: retryResult.attempts,
        skipped: false,
      };
    } catch (err) {
      return { success: false, steps: results };
    }

    results.push(stepResult);
    previousExitCode = stepResult.exitCode;

    if (stepResult.exitCode !== 0 && !step.continueOnError) {
      return { success: false, steps: results };
    }
  }

  return { success: true, steps: results };
}

function evaluateCondition(step: StepConfig, previousExitCode: number): boolean {
  if (!step.condition) return false;
  if (step.condition === 'on_success') return previousExitCode !== 0;
  if (step.condition === 'on_failure') return previousExitCode === 0;
  return false;
}
