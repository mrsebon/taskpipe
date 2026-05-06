import * as fs from 'fs';
import * as path from 'path';
import {
  buildSnapshotId,
  writeSnapshot,
  readSnapshot,
  listSnapshots,
  deleteSnapshot,
  PipelineSnapshot,
} from './snapshot';

const SNAPSHOT_DIR = '.taskpipe/snapshots';

function makePipeline(overrides?: Partial<PipelineSnapshot>): PipelineSnapshot {
  return {
    pipelineId: 'test-pipeline',
    startedAt: '2024-01-01T00:00:00.000Z',
    finishedAt: '2024-01-01T00:00:05.000Z',
    passed: true,
    steps: [
      {
        stepId: 'step-1',
        command: 'echo hello',
        exitCode: 0,
        stdout: 'hello',
        stderr: '',
        durationMs: 120,
        timestamp: '2024-01-01T00:00:01.000Z',
      },
    ],
    ...overrides,
  };
}

afterEach(() => {
  if (fs.existsSync(SNAPSHOT_DIR)) {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
  }
});

describe('buildSnapshotId', () => {
  it('returns a 12-char hex string', () => {
    const id = buildSnapshotId('my-pipeline', '2024-01-01T00:00:00.000Z');
    expect(id).toMatch(/^[a-f0-9]{12}$/);
  });

  it('is deterministic for the same inputs', () => {
    const a = buildSnapshotId('pipe', 'ts');
    const b = buildSnapshotId('pipe', 'ts');
    expect(a).toBe(b);
  });
});

describe('writeSnapshot / readSnapshot', () => {
  it('writes and reads back a snapshot', () => {
    const snapshot = makePipeline();
    const filePath = writeSnapshot(snapshot);
    expect(fs.existsSync(filePath)).toBe(true);

    const id = buildSnapshotId(snapshot.pipelineId, snapshot.startedAt);
    const loaded = readSnapshot(id);
    expect(loaded).toEqual(snapshot);
  });

  it('returns null for unknown snapshot id', () => {
    expect(readSnapshot('nonexistent')).toBeNull();
  });
});

describe('listSnapshots', () => {
  it('returns empty array when dir does not exist', () => {
    expect(listSnapshots()).toEqual([]);
  });

  it('lists written snapshots', () => {
    writeSnapshot(makePipeline({ startedAt: '2024-01-01T00:00:00.000Z' }));
    writeSnapshot(makePipeline({ startedAt: '2024-01-02T00:00:00.000Z' }));
    expect(listSnapshots().length).toBe(2);
  });
});

describe('deleteSnapshot', () => {
  it('deletes an existing snapshot and returns true', () => {
    const snapshot = makePipeline();
    writeSnapshot(snapshot);
    const id = buildSnapshotId(snapshot.pipelineId, snapshot.startedAt);
    expect(deleteSnapshot(id)).toBe(true);
    expect(readSnapshot(id)).toBeNull();
  });

  it('returns false when snapshot does not exist', () => {
    expect(deleteSnapshot('ghost')).toBe(false);
  });
});
