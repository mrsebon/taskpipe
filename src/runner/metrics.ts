export interface StepMetrics {
  stepId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  exitCode: number | null;
  retries: number;
  skipped: boolean;
  timedOut: boolean;
}

export interface PipelineMetrics {
  pipelineId: string;
  startedAt: number;
  finishedAt: number;
  totalDurationMs: number;
  steps: StepMetrics[];
  totalSteps: number;
  skippedSteps: number;
  failedSteps: number;
  succeededSteps: number;
}

export function createStepMetrics(
  stepId: string,
  startedAt: number
): Omit<StepMetrics, 'finishedAt' | 'durationMs'> & { finalize: (opts: Partial<StepMetrics>) => StepMetrics } {
  return {
    stepId,
    startedAt,
    exitCode: null,
    retries: 0,
    skipped: false,
    timedOut: false,
    finalize(opts: Partial<StepMetrics>): StepMetrics {
      const finishedAt = opts.finishedAt ?? Date.now();
      return {
        stepId,
        startedAt,
        finishedAt,
        durationMs: finishedAt - startedAt,
        exitCode: opts.exitCode ?? null,
        retries: opts.retries ?? 0,
        skipped: opts.skipped ?? false,
        timedOut: opts.timedOut ?? false,
      };
    },
  };
}

export function aggregatePipelineMetrics(
  pipelineId: string,
  startedAt: number,
  steps: StepMetrics[]
): PipelineMetrics {
  const finishedAt = Date.now();
  return {
    pipelineId,
    startedAt,
    finishedAt,
    totalDurationMs: finishedAt - startedAt,
    steps,
    totalSteps: steps.length,
    skippedSteps: steps.filter((s) => s.skipped).length,
    failedSteps: steps.filter((s) => !s.skipped && s.exitCode !== 0).length,
    succeededSteps: steps.filter((s) => !s.skipped && s.exitCode === 0).length,
  };
}
