import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  buildCacheKey,
  readCacheEntry,
  writeCacheEntry,
  clearCacheDir,
  parseCacheTtl,
  CacheEntry,
} from './cache';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskpipe-cache-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('buildCacheKey', () => {
  it('returns a 16-char hex string', () => {
    const key = buildCacheKey('step1', 'echo hello', { NODE_ENV: 'test' });
    expect(key).toMatch(/^[0-9a-f]{16}$/);
  });

  it('produces different keys for different commands', () => {
    const k1 = buildCacheKey('step1', 'echo hello', {});
    const k2 = buildCacheKey('step1', 'echo world', {});
    expect(k1).not.toBe(k2);
  });
});

describe('writeCacheEntry / readCacheEntry', () => {
  it('writes and reads back a valid entry', () => {
    const key = 'abc123';
    writeCacheEntry({ key, stepId: 'build', exitCode: 0, stdout: 'ok', ttlMs: 60000 }, tmpDir);
    const entry = readCacheEntry(key, tmpDir);
    expect(entry).not.toBeNull();
    expect(entry!.stepId).toBe('build');
    expect(entry!.stdout).toBe('ok');
  });

  it('returns null for missing entry', () => {
    expect(readCacheEntry('nonexistent', tmpDir)).toBeNull();
  });

  it('returns null and removes file when TTL expired', () => {
    const key = 'expired';
    writeCacheEntry({ key, stepId: 's', exitCode: 0, stdout: '', ttlMs: 0 }, tmpDir);
    const entry = readCacheEntry(key, tmpDir);
    expect(entry).toBeNull();
    expect(fs.existsSync(path.join(tmpDir, `${key}.json`))).toBe(false);
  });
});

describe('clearCacheDir', () => {
  it('deletes all json files and returns count', () => {
    writeCacheEntry({ key: 'k1', stepId: 's', exitCode: 0, stdout: '', ttlMs: 60000 }, tmpDir);
    writeCacheEntry({ key: 'k2', stepId: 's', exitCode: 0, stdout: '', ttlMs: 60000 }, tmpDir);
    const count = clearCacheDir(tmpDir);
    expect(count).toBe(2);
    expect(fs.readdirSync(tmpDir)).toHaveLength(0);
  });

  it('returns 0 when directory does not exist', () => {
    expect(clearCacheDir('/nonexistent/path/xyz')).toBe(0);
  });
});

describe('parseCacheTtl', () => {
  it.each([
    [undefined, 300000],
    [5000, 5000],
    ['500ms', 500],
    ['30s', 30000],
    ['2m', 120000],
    ['1h', 3600000],
  ])('parses %s as %i ms', (input, expected) => {
    expect(parseCacheTtl(input as any)).toBe(expected);
  });

  it('throws on invalid format', () => {
    expect(() => parseCacheTtl('abc')).toThrow('Invalid cache TTL');
  });
});
