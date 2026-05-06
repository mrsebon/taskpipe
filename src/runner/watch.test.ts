import { EventEmitter } from 'events';
import { buildWatchOptions, createWatcher, stopWatcher, WatchEvent } from './watch';

describe('buildWatchOptions', () => {
  it('applies defaults for missing fields', () => {
    const opts = buildWatchOptions({});
    expect(opts.paths).toEqual(['.']);
    expect(opts.debounceMs).toBe(300);
    expect(opts.ignore).toContain('node_modules/**');
    expect(opts.cwd).toBe(process.cwd());
  });

  it('preserves provided values', () => {
    const opts = buildWatchOptions({
      paths: ['src'],
      debounceMs: 500,
      ignore: ['dist/**'],
      cwd: '/tmp',
    });
    expect(opts.paths).toEqual(['src']);
    expect(opts.debounceMs).toBe(500);
    expect(opts.ignore).toEqual(['dist/**']);
    expect(opts.cwd).toBe('/tmp');
  });
});

describe('createWatcher', () => {
  it('returns a watcher and emits change events', (done) => {
    const emitter = new EventEmitter();
    const opts = buildWatchOptions({ paths: ['.'], debounceMs: 50 });
    const watcher = createWatcher(opts, emitter);

    emitter.once('change', (events: WatchEvent[]) => {
      expect(Array.isArray(events)).toBe(true);
      stopWatcher(watcher).then(done);
    });

    // Simulate internal event emission by triggering watcher listeners
    watcher.emit('change', __filename);
  });

  it('batches multiple rapid events', (done) => {
    const emitter = new EventEmitter();
    const opts = buildWatchOptions({ paths: ['.'], debounceMs: 80 });
    const watcher = createWatcher(opts, emitter);

    emitter.once('change', (events: WatchEvent[]) => {
      expect(events.length).toBeGreaterThanOrEqual(2);
      stopWatcher(watcher).then(done);
    });

    watcher.emit('change', 'file1.ts');
    watcher.emit('change', 'file2.ts');
  });

  it('stopWatcher resolves without error', async () => {
    const emitter = new EventEmitter();
    const opts = buildWatchOptions({ paths: ['.'] });
    const watcher = createWatcher(opts, emitter);
    await expect(stopWatcher(watcher)).resolves.toBeUndefined();
  });
});
