import pLimit from "p-limit";

export interface ConcurrentStep {
  name: string;
  run: () => Promise<StepResult>;
}

export interface StepResult {
  name: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface ConcurrencyOptions {
  maxConcurrent: number;
  failFast?: boolean;
}

export function buildConcurrencyOptions(
  raw: Partial<ConcurrencyOptions> = {}
): ConcurrencyOptions {
  const maxConcurrent = Math.max(1, raw.maxConcurrent ?? 4);
  return {
    maxConcurrent,
    failFast: raw.failFast ?? false,
  };
}

export async function runConcurrentSteps(
  steps: ConcurrentStep[],
  options: ConcurrencyOptions
): Promise<StepResult[]> {
  const limit = pLimit(options.maxConcurrent);
  const results: StepResult[] = [];
  let aborted = false;

  const tasks = steps.map((step) =>
    limit(async () => {
      if (aborted) {
        return {
          name: step.name,
          success: false,
          durationMs: 0,
          error: "Skipped due to failFast",
        } satisfies StepResult;
      }

      const start = Date.now();
      try {
        const result = await step.run();
        if (!result.success && options.failFast) {
          aborted = true;
        }
        results.push(result);
        return result;
      } catch (err) {
        const result: StepResult = {
          name: step.name,
          success: false,
          durationMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
        if (options.failFast) aborted = true;
        results.push(result);
        return result;
      }
    })
  );

  await Promise.all(tasks);
  return results;
}
