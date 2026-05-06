import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StepSnapshot {
  stepId: string;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timestamp: string;
}

export interface PipelineSnapshot {
  pipelineId: string;
  startedAt: string;
  finishedAt: string;
  steps: StepSnapshot[];
  passed: boolean;
}

const SNAPSHOT_DIR = '.taskpipe/snapshots';

export function buildSnapshotId(pipelineId: string, startedAt: string): string {
  const raw = `${pipelineId}:${startedAt}`;
  return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
}

export function snapshotFilePath(snapshotId: string): string {
  return path.join(SNAPSHOT_DIR, `${snapshotId}.json`);
}

export function writeSnapshot(snapshot: PipelineSnapshot): string {
  const id = buildSnapshotId(snapshot.pipelineId, snapshot.startedAt);
  const filePath = snapshotFilePath(id);
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return filePath;
}

export function readSnapshot(snapshotId: string): PipelineSnapshot | null {
  const filePath = snapshotFilePath(snapshotId);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as PipelineSnapshot;
}

export function listSnapshots(): string[] {
  if (!fs.existsSync(SNAPSHOT_DIR)) return [];
  return fs
    .readdirSync(SNAPSHOT_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
}

export function deleteSnapshot(snapshotId: string): boolean {
  const filePath = snapshotFilePath(snapshotId);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}
