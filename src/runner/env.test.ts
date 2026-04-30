import { buildEnvContext, loadDotEnvFile, interpolateEnv } from './env';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('buildEnvContext', () => {
  it('includes process.env when inheritEnv is true', () => {
    process.env.TEST_TASKPIPE_VAR = 'hello';
    const ctx = buildEnvContext({}, true);
    expect(ctx.vars['TEST_TASKPIPE_VAR']).toBe('hello');
    delete process.env.TEST_TASKPIPE_VAR;
  });

  it('does not include process.env when inheritEnv is false', () => {
    process.env.TEST_TASKPIPE_VAR = 'hello';
    const ctx = buildEnvContext({}, false);
    expect(ctx.vars['TEST_TASKPIPE_VAR']).toBeUndefined();
    delete process.env.TEST_TASKPIPE_VAR;
  });

  it('pipeline vars override process.env', () => {
    process.env.SHARED_KEY = 'from-env';
    const ctx = buildEnvContext({ SHARED_KEY: 'from-pipeline' }, true);
    expect(ctx.vars['SHARED_KEY']).toBe('from-pipeline');
    delete process.env.SHARED_KEY;
  });

  it('returns empty vars when inheritEnv is false and no pipeline vars', () => {
    const ctx = buildEnvContext({}, false);
    expect(Object.keys(ctx.vars)).toHaveLength(0);
  });
});

describe('loadDotEnvFile', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `.env-test-${Date.now()}`);
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it('returns empty object for non-existent file', () => {
    expect(loadDotEnvFile('/non/existent/.env')).toEqual({});
  });

  it('parses KEY=VALUE pairs', () => {
    fs.writeFileSync(tmpFile, 'FOO=bar\nBAZ=qux\n');
    expect(loadDotEnvFile(tmpFile)).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('ignores comments and empty lines', () => {
    fs.writeFileSync(tmpFile, '# comment\n\nFOO=bar\n');
    expect(loadDotEnvFile(tmpFile)).toEqual({ FOO: 'bar' });
  });

  it('strips surrounding quotes from values', () => {
    fs.writeFileSync(tmpFile, 'FOO="hello world"\nBAR=\'single\'\n');
    expect(loadDotEnvFile(tmpFile)).toEqual({ FOO: 'hello world', BAR: 'single' });
  });
});

describe('interpolateEnv', () => {
  const ctx = { vars: { NAME: 'world', VERSION: '1.0' } };

  it('replaces known placeholders', () => {
    expect(interpolateEnv('Hello ${NAME}!', ctx)).toBe('Hello world!');
  });

  it('replaces multiple placeholders', () => {
    expect(interpolateEnv('${NAME} v${VERSION}', ctx)).toBe('world v1.0');
  });

  it('replaces unknown placeholders with empty string', () => {
    expect(interpolateEnv('Hello ${UNKNOWN}!', ctx)).toBe('Hello !');
  });

  it('returns string unchanged when no placeholders present', () => {
    expect(interpolateEnv('no placeholders here', ctx)).toBe('no placeholders here');
  });
});
