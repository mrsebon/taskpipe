import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { formatOutput, writeOutputFile, PipelineOutput } from './output';

const mockOutput: PipelineOutput = {
  pipelineName: 'test-pipeline',
  startedAt: '2024-01-01T00:00:00.000Z',
  finishedAt: '2024-01-01T00:00:01.000Z',
  totalDurationMs: 1000,
  success: true,
  steps: [
    {
      stepName: 'lint',
      command: 'npm run lint',
      exitCode: 0,
      stdout: 'All files pass linting.',
      stderr: '',
      durationMs: 400,
      attempts: 1,
    },
    {
      stepName: 'test',
      command: 'npm test',
      exitCode: 0,
      stdout: 'Tests passed.',
      stderr: '',
      durationMs: 600,
      attempts: 1,
    },
  ],
};

describe('formatOutput', () => {
  it('formats as JSON correctly', () => {
    const result = formatOutput(mockOutput, 'json');
    const parsed = JSON.parse(result);
    expect(parsed.pipelineName).toBe('test-pipeline');
    expect(parsed.steps).toHaveLength(2);
    expect(parsed.success).toBe(true);
  });

  it('formats as text with pipeline name and status', () => {
    const result = formatOutput(mockOutput, 'text');
    expect(result).toContain('Pipeline: test-pipeline');
    expect(result).toContain('Status:   SUCCESS');
    expect(result).toContain('Duration: 1000ms');
  });

  it('includes step details in text format', () => {
    const result = formatOutput(mockOutput, 'text');
    expect(result).toContain('[PASS] lint');
    expect(result).toContain('npm run lint');
    expect(result).toContain('All files pass linting.');
  });

  it('shows SKIPPED status for skipped steps', () => {
    const output = {
      ...mockOutput,
      steps: [{ ...mockOutput.steps[0], skipped: true }],
    };
    const result = formatOutput(output, 'text');
    expect(result).toContain('[SKIPPED] lint');
  });

  it('shows FAILED status for failed steps', () => {
    const output = {
      ...mockOutput,
      success: false,
      steps: [{ ...mockOutput.steps[0], exitCode: 1 }],
    };
    const result = formatOutput(output, 'text');
    expect(result).toContain('[FAIL] lint');
    expect(result).toContain('Status:   FAILED');
  });
});

describe('writeOutputFile', () => {
  const tmpPath = path.join('tmp-test-output', 'result.json');

  afterEach(() => {
    if (fs.existsSync('tmp-test-output')) {
      fs.rmSync('tmp-test-output', { recursive: true });
    }
  });

  it('creates the file and parent directories', () => {
    writeOutputFile(mockOutput, 'json', tmpPath);
    expect(fs.existsSync(tmpPath)).toBe(true);
  });

  it('writes valid JSON content', () => {
    writeOutputFile(mockOutput, 'json', tmpPath);
    const content = fs.readFileSync(tmpPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.pipelineName).toBe('test-pipeline');
  });
});
