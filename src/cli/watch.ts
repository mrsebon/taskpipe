import { Command } from 'commander';
import { EventEmitter } from 'events';
import * as path from 'path';
import { buildWatchOptions, createWatcher, stopWatcher, WatchEvent } from '../runner/watch';
import { createLogger } from '../runner/logger';

export function registerWatchCommand(program: Command): void {
  program
    .command('watch')
    .description('Re-run a pipeline whenever watched files change')
    .argument('<config>', 'Path to pipeline config file')
    .option('--watch-path <paths...>', 'Paths to watch (default: .)')
    .option('--ignore <patterns...>', 'Glob patterns to ignore')
    .option('--debounce <ms>', 'Debounce delay in milliseconds', '300')
    .option('--verbose', 'Enable verbose logging')
    .action(async (configArg: string, opts) => {
      const logger = createLogger({ verbose: !!opts.verbose });
      const configPath = path.resolve(process.cwd(), configArg);

      const watchOpts = buildWatchOptions({
        paths: opts.watchPath ?? ['.'],
        ignore: opts.ignore,
        debounceMs: parseInt(opts.debounce, 10),
        cwd: process.cwd(),
      });

      logger.info(`Watching for changes. Config: ${configPath}`);
      logger.info(`Paths: ${watchOpts.paths.join(', ')}`);

      const emitter = new EventEmitter();
      const watcher = createWatcher(watchOpts, emitter);

      let running = false;

      emitter.on('change', async (events: WatchEvent[]) => {
        if (running) {
          logger.warn('Pipeline already running, skipping trigger.');
          return;
        }
        running = true;
        const changed = events.map((e) => e.filePath).join(', ');
        logger.info(`Change detected: ${changed}`);

        try {
          const { runPipeline } = await import('./run');
          await (runPipeline as Function)(configPath, opts);
        } catch (err: any) {
          logger.error(`Pipeline failed: ${err.message}`);
        } finally {
          running = false;
        }
      });

      const shutdown = async () => {
        logger.info('Stopping watcher...');
        await stopWatcher(watcher);
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });
}
