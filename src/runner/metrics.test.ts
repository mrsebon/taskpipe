import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createStepMetrics,
  aggregatePipelineMetrics,
  StepMetrics,
} from './metrics';

describe('createStepMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('finalizes with correct duration', () => {
    const builder = createStepMetrics('build', 1000);
    vi.setSystemTime(1500);
    const metrics = builder.finalize({ exitCode: 0 });
    expect(metrics.durationMs).toBe(500);
    expect(metrics.stepId).toBe('build');
    expect(metrics.exitCode).toBe(0);
    expect(metrics.skipped).toBe(false);
    expect(metrics.timedOut).toBe(false);
  });

  it('records retries and timedOut flags', () => {
    const builder = createStepMetrics('deploy', 2000);
    vi.setSystemTime(3000);
    const metrics = builder.finalize({ exitCode: 1, retries: 3, timedOut: true });
    expect(metrics.retries).toBe(3);
    expect(metrics.timedOut).toBe(true);
    expect(metrics.exitCode).toBe(1);
  });

  it('marks step as skipped', () => {
    const builder = createStepMetrics('lint', 500);
    const metrics = builder.finalize({ skipped: true, exitCode: null });
    expect(metrics.skipped).toBe(true);
    expect(metrics.exitCode).toBeNull();
  });
});

describe('aggregatePipelineMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(5000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggregates step counts correctly', () => {
    const steps: StepMetrics[] = [
      { stepId: 'a', startedAt: 0, finishedAt: 100, durationMs: 100, exitCode: 0, retries: 0, skipped: false, timedOut: false },
      { stepId: 'b', startedAt: 100, finishedAt: 200, durationMs: 100, exitCode: 1, retries: 1, skipped: false, timedOut: false },
      { stepId: 'c', startedAt: 200, finishedAt: 200, durationMs: 0, exitCode: null, retries: 0, skipped: true, timedOut: false },
    ];
    const result = aggregatePipelineMetrics('my-pipeline', 0, steps);
    expect(result.totalSteps).toBe(3);
    expect(result.succeededSteps).toBe(1);
    expect(result.failedSteps).toBe(1);
    expect(result.skippedSteps).toBe(1);
    expect(result.pipelineId).toBe('my-pipeline');
    expect(result.finishedAt).toBe(5000);
  });
});
