import { Command } from 'commander';
import { clearCacheDir, readCacheEntry, buildCacheKey } from '../runner/cache';

const DEFAULT_CACHE_DIR = '.taskpipe/cache';

export function registerCacheCommand(program: Command): void {
  const cache = program
    .command('cache')
    .description('Manage the taskpipe step result cache');

  cache
    .command('clear')
    .description('Remove all cached step results')
    .option('--cache-dir <dir>', 'Cache directory', DEFAULT_CACHE_DIR)
    .action((opts: { cacheDir: string }) => {
      const count = clearCacheDir(opts.cacheDir);
      if (count === 0) {
        console.log('Cache is already empty.');
      } else {
        console.log(`Cleared ${count} cache entr${count === 1 ? 'y' : 'ies'} from ${opts.cacheDir}.`);
      }
    });

  cache
    .command('inspect <stepId> <command>')
    .description('Inspect the cached result for a step/command pair')
    .option('--cache-dir <dir>', 'Cache directory', DEFAULT_CACHE_DIR)
    .option('--env <pairs...>', 'KEY=VALUE env pairs used to compute cache key')
    .action((stepId: string, command: string, opts: { cacheDir: string; env?: string[] }) => {
      const env: Record<string, string> = {};
      (opts.env ?? []).forEach((pair) => {
        const idx = pair.indexOf('=');
        if (idx !== -1) {
          env[pair.slice(0, idx)] = pair.slice(idx + 1);
        }
      });

      const key = buildCacheKey(stepId, command, env);
      const entry = readCacheEntry(key, opts.cacheDir);

      if (!entry) {
        console.log(`No valid cache entry found for step "${stepId}" (key: ${key}).`);
        process.exitCode = 1;
        return;
      }

      const ageSeconds = Math.floor((Date.now() - entry.createdAt) / 1000);
      const remainingSeconds = Math.max(0, Math.floor((entry.ttlMs - (Date.now() - entry.createdAt)) / 1000));

      console.log(`Cache entry for step "${stepId}"`);
      console.log(`  Key      : ${key}`);
      console.log(`  Exit code: ${entry.exitCode}`);
      console.log(`  Age      : ${ageSeconds}s`);
      console.log(`  TTL left : ${remainingSeconds}s`);
      console.log(`  Stdout   : ${entry.stdout.slice(0, 120)}${entry.stdout.length > 120 ? '…' : ''}`);
    });
}
