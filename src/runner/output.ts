import * as fs from 'fs';
import * as path from 'path';

export type OutputFormat = 'text' | 'json';

export interface StepResult {
  stepName: string;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  attempts: number;
  skipped?: boolean;
}

export interface PipelineOutput {
  pipelineName: string;
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  success: boolean;
  steps: StepResult[];
}

export function formatOutput(output: PipelineOutput, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(output, null, 2);
  }

  const lines: string[] = [];
  lines.push(`Pipeline: ${output.pipelineName}`);
  lines.push(`Status:   ${output.success ? 'SUCCESS' : 'FAILED'}`);
  lines.push(`Duration: ${output.totalDurationMs}ms`);
  lines.push(`Started:  ${output.startedAt}`);
  lines.push(`Finished: ${output.finishedAt}`);
  lines.push('');

  for (const step of output.steps) {
    const status = step.skipped ? 'SKIPPED' : step.exitCode === 0 ? 'PASS' : 'FAIL';
    lines.push(`  [${status}] ${step.stepName} (${step.durationMs}ms, attempts: ${step.attempts})`);
    lines.push(`         cmd: ${step.command}`);
    if (step.stdout.trim()) {
      lines.push(`         stdout: ${step.stdout.trim().split('\n').join('\n                 ')}`);
    }
    if (step.stderr.trim()) {
      lines.push(`         stderr: ${step.stderr.trim().split('\n').join('\n                 ')}`);
    }
  }

  return lines.join('\n');
}

export function writeOutputFile(
  output: PipelineOutput,
  format: OutputFormat,
  outputPath: string
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, formatOutput(output, format), 'utf-8');
}
