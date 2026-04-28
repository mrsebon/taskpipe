import * as fs from 'fs';
import * as path from 'path';
import { parsePipelineConfig } from '../config/schema';
import { runPipeline } from '../runner/pipeline';

export interface RunOptions {
  configPath?: string;
  env?: Record<string, string>;
  verbose?: boolean;
}

export async function runCli(options: RunOptions = {}): Promise<void> {
  const configPath = options.configPath ?? path.resolve(process.cwd(), 'taskpipe.json');

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  let rawConfig: unknown;
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    rawConfig = JSON.parse(content);
  } catch {
    console.error('Failed to parse config file as JSON.');
    process.exit(1);
  }

  const config = parsePipelineConfig(rawConfig);
  const env = { ...process.env, ...(options.env ?? {}) } as Record<string, string>;

  if (options.verbose) {
    console.log(`Running pipeline with ${config.steps.length} step(s)...`);
  }

  const result = await runPipeline(config, env);

  for (const step of result.steps) {
    if (step.skipped) {
      console.log(`[SKIP] ${step.stepName}`);
    } else {
      const status = step.exitCode === 0 ? 'OK' : 'FAIL';
      const retryNote = step.attempts > 1 ? ` (${step.attempts} attempts)` : '';
      console.log(`[${status}] ${step.stepName}${retryNote}`);
      if (options.verbose && step.stdout) console.log(step.stdout.trim());
      if (step.stderr) console.error(step.stderr.trim());
    }
  }

  if (!result.success) {
    process.exit(1);
  }
}
