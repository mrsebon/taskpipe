import * as fs from 'fs';
import * as path from 'path';
import { parsePipelineConfig } from '../config/schema';
import { runOnce } from '../runner/executor';
import { buildRetryOptions } from '../runner/retry';
import { evaluateCondition } from '../runner/pipeline';
import { createLogger } from '../runner/logger';

export interface RunOptions {
  config: string;
  verbose?: boolean;
  logFile?: string;
}

export async function runPipeline(options: RunOptions): Promise<void> {
  const logger = createLogger({ verbose: options.verbose, logFile: options.logFile });

  const configPath = path.resolve(options.config);
  if (!fs.existsSync(configPath)) {
    logger.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const pipeline = parsePipelineConfig(raw);

  logger.info(`Starting pipeline: ${pipeline.name}`);

  const context: Record<string, number> = {};

  for (const step of pipeline.steps) {
    if (step.condition) {
      const shouldRun = evaluateCondition(step.condition, context);
      if (!shouldRun) {
        logger.info(`Skipping step (condition not met)`, step.name);
        continue;
      }
    }

    logger.info(`Running: ${step.command}`, step.name);
    const retryOptions = buildRetryOptions(step.retry);

    let attempt = 0;
    let success = false;

    while (attempt <= retryOptions.maxAttempts) {
      if (attempt > 0) {
        logger.warn(`Retrying (attempt ${attempt}/${retryOptions.maxAttempts})`, step.name);
      }
      const result = await runOnce(step.command);
      context[step.name] = result.exitCode;

      if (result.exitCode === 0) {
        logger.info(`Completed successfully`, step.name);
        success = true;
        break;
      }

      logger.debug(`Exit code: ${result.exitCode}`, step.name);
      attempt++;
    }

    if (!success) {
      logger.error(`Step failed after ${retryOptions.maxAttempts} retries`, step.name);
      if (!step.continueOnError) {
        logger.error('Pipeline aborted.');
        process.exit(1);
      }
    }
  }

  logger.info(`Pipeline "${pipeline.name}" completed.`);
}
