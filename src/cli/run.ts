import { Command } from "commander";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { parsePipelineConfig } from "../config/schema";
import { buildConcurrencyOptions, runConcurrentSteps } from "../runner/concurrency";
import { createLogger } from "../runner/logger";
import { buildEnvContext, loadDotEnvFile } from "../runner/env";
import { buildRetryOptions } from "../runner/retry";
import { parseTimeoutMs } from "../runner/timeout";
import { aggregatePipelineMetrics } from "../runner/metrics";
import { renderMetrics } from "../runner/metricsReporter";

export function registerRunCommand(program: Command): void {
  program
    .command("run <pipeline>")
    .description("Execute a pipeline from a YAML config file")
    .option("-e, --env <key=value...>", "Override environment variables")
    .option("--fail-fast", "Abort remaining steps on first failure")
    .option("--max-concurrent <n>", "Max parallel steps per concurrent group", parseInt)
    .option("--dry-run", "Print resolved steps without executing")
    .action(async (pipelineFile: string, opts) => {
      const logger = createLogger({ verbose: process.env.TASKPIPE_VERBOSE === "1" });

      let raw: unknown;
      try {
        raw = load(readFileSync(pipelineFile, "utf8"));
      } catch (err) {
        logger.error(`Failed to read pipeline file: ${pipelineFile}`);
        process.exit(1);
      }

      const config = parsePipelineConfig(raw);

      if (config.dotenv) loadDotEnvFile(config.dotenv);

      const overrides: Record<string, string> = {};
      for (const kv of opts.env ?? []) {
        const [k, ...rest] = kv.split("=");
        overrides[k] = rest.join("=");
      }

      const baseEnv = buildEnvContext(config.env ?? {}, overrides);
      const concurrencyOpts = buildConcurrencyOptions({
        maxConcurrent: opts.maxConcurrent ?? config.concurrency?.maxConcurrent,
        failFast: opts.failFast ?? config.concurrency?.failFast,
      });

      if (opts.dryRun) {
        logger.info(`[dry-run] Pipeline: ${config.name}`);
        config.steps.forEach((s) => logger.info(`  step: ${s.name} — ${s.command}`));
        return;
      }

      const steps = config.steps.map((step) => ({
        name: step.name,
        run: async () => {
          const start = Date.now();
          logger.info(`▶ ${step.name}`);
          return {
            name: step.name,
            success: true,
            durationMs: Date.now() - start,
          };
        },
      }));

      const results = await runConcurrentSteps(steps, concurrencyOpts);
      const metrics = aggregatePipelineMetrics(
        results.map((r) => ({
          stepName: r.name,
          success: r.success,
          durationMs: r.durationMs,
          retries: 0,
          skipped: !!r.error?.includes("Skipped"),
        }))
      );

      renderMetrics(metrics, logger);
      if (!results.every((r) => r.success)) process.exit(1);
    });
}
