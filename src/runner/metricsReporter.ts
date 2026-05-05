import * as fs from 'fs';
import * as path from 'path';
import { PipelineMetrics } from './metrics';

export type MetricsFormat = 'json' | 'summary';

export function formatMetricsSummary(metrics: PipelineMetrics): string {
  const lines: string[] = [
    `Pipeline : ${metrics.pipelineId}`,
    `Duration : ${metrics.totalDurationMs}ms`,
    `Steps    : ${metrics.totalSteps} total, ${metrics.succeededSteps} succeeded, ${metrics.failedSteps} failed, ${metrics.skippedSteps} skipped`,
    '',
    'Step breakdown:',
  ];

  for (const step of metrics.steps) {
    const status = step.skipped
      ? 'SKIPPED'
      : step.exitCode === 0
      ? 'OK'
      : 'FAIL';
    const retryNote = step.retries > 0 ? ` (retries: ${step.retries})` : '';
    const timeoutNote = step.timedOut ? ' [TIMED OUT]' : '';
    lines.push(`  [${status}] ${step.stepId} — ${step.durationMs}ms${retryNote}${timeoutNote}`);
  }

  return lines.join('\n');
}

export function renderMetrics(
  metrics: PipelineMetrics,
  format: MetricsFormat
): string {
  if (format === 'json') {
    return JSON.stringify(metrics, null, 2);
  }
  return formatMetricsSummary(metrics);
}

export function writeMetricsFile(
  metrics: PipelineMetrics,
  outputPath: string,
  format: MetricsFormat = 'json'
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const content = renderMetrics(metrics, format);
  fs.writeFileSync(outputPath, content, 'utf-8');
}
