import * as chokidar from 'chokidar';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface WatchOptions {
  paths: string[];
  ignore?: string[];
  debounceMs?: number;
  cwd?: string;
}

export interface WatchEvent {
  type: 'add' | 'change' | 'unlink';
  filePath: string;
  timestamp: number;
}

export function buildWatchOptions(raw: Partial<WatchOptions>): WatchOptions {
  return {
    paths: raw.paths ?? ['.'],
    ignore: raw.ignore ?? ['node_modules/**', '.git/**', '**/*.log'],
    debounceMs: raw.debounceMs ?? 300,
    cwd: raw.cwd ?? process.cwd(),
  };
}

export function createWatcher(
  options: WatchOptions,
  emitter: EventEmitter
): chokidar.FSWatcher {
  const resolvedPaths = options.paths.map((p) =>
    path.resolve(options.cwd ?? process.cwd(), p)
  );

  const watcher = chokidar.watch(resolvedPaths, {
    ignored: options.ignore,
    persistent: true,
    ignoreInitial: true,
  });

  let debounceTimer: NodeJS.Timeout | null = null;
  const pendingEvents: WatchEvent[] = [];

  const flush = () => {
    const batch = [...pendingEvents];
    pendingEvents.length = 0;
    emitter.emit('change', batch);
  };

  const enqueue = (type: WatchEvent['type'], filePath: string) => {
    pendingEvents.push({ type, filePath, timestamp: Date.now() });
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, options.debounceMs ?? 300);
  };

  watcher
    .on('add', (fp) => enqueue('add', fp))
    .on('change', (fp) => enqueue('change', fp))
    .on('unlink', (fp) => enqueue('unlink', fp));

  return watcher;
}

export function stopWatcher(watcher: chokidar.FSWatcher): Promise<void> {
  return watcher.close();
}
