import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry {
  key: string;
  stepId: string;
  exitCode: number;
  stdout: string;
  createdAt: number;
  ttlMs: number;
}

export interface CacheOptions {
  ttlMs: number;
  cacheDir: string;
}

const DEFAULT_CACHE_DIR = '.taskpipe/cache';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function buildCacheKey(stepId: string, command: string, env: Record<string, string>): string {
  const payload = JSON.stringify({ stepId, command, env });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export function readCacheEntry(key: string, cacheDir: string = DEFAULT_CACHE_DIR): CacheEntry | null {
  const filePath = path.join(cacheDir, `${key}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const entry: CacheEntry = JSON.parse(raw);
    const age = Date.now() - entry.createdAt;
    if (age > entry.ttlMs) {
      fs.unlinkSync(filePath);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function writeCacheEntry(
  entry: Omit<CacheEntry, 'createdAt'>,
  cacheDir: string = DEFAULT_CACHE_DIR
): void {
  fs.mkdirSync(cacheDir, { recursive: true });
  const filePath = path.join(cacheDir, `${entry.key}.json`);
  const full: CacheEntry = { ...entry, createdAt: Date.now() };
  fs.writeFileSync(filePath, JSON.stringify(full, null, 2), 'utf-8');
}

export function clearCacheDir(cacheDir: string = DEFAULT_CACHE_DIR): number {
  if (!fs.existsSync(cacheDir)) return 0;
  const files = fs.readdirSync(cacheDir).filter((f) => f.endsWith('.json'));
  files.forEach((f) => fs.unlinkSync(path.join(cacheDir, f)));
  return files.length;
}

export function parseCacheTtl(raw: string | number | undefined): number {
  if (raw === undefined) return DEFAULT_TTL_MS;
  if (typeof raw === 'number') return raw;
  const match = raw.match(/^(\d+)(ms|s|m|h)?$/);
  if (!match) throw new Error(`Invalid cache TTL: "${raw}"`);
  const value = parseInt(match[1], 10);
  const unit = match[2] ?? 'ms';
  const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000 };
  return value * multipliers[unit];
}
