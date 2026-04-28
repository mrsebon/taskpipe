import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Logger, createLogger } from './logger';

describe('Logger', () => {
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('writes info messages to stdout', () => {
    const logger = createLogger();
    logger.info('hello world');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain('INFO');
    expect(output).toContain('hello world');
  });

  it('writes error messages to stderr', () => {
    const logger = createLogger();
    logger.error('something broke', 'build');
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('ERROR');
    expect(output).toContain('[build]');
    expect(output).toContain('something broke');
  });

  it('suppresses debug messages when verbose is false', () => {
    const logger = createLogger({ verbose: false });
    logger.debug('debug info');
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('shows debug messages when verbose is true', () => {
    const logger = createLogger({ verbose: true });
    logger.debug('debug info');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0][0]).toContain('DEBUG');
  });

  it('includes step tag when step is provided', () => {
    const logger = createLogger();
    logger.warn('low disk space', 'deploy');
    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain('[deploy]');
  });

  it('writes JSON log entries to a file when logFile is set', () => {
    const tmpFile = path.join(os.tmpdir(), `taskpipe-test-${Date.now()}.log`);
    try {
      const logger = createLogger({ logFile: tmpFile });
      logger.info('file log test', 'step1');
      const contents = fs.readFileSync(tmpFile, 'utf8').trim();
      const entry = JSON.parse(contents);
      expect(entry.level).toBe('info');
      expect(entry.message).toBe('file log test');
      expect(entry.step).toBe('step1');
      expect(entry.timestamp).toBeDefined();
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });
});
