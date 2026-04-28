import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  step?: string;
  message: string;
}

export interface LoggerOptions {
  verbose?: boolean;
  logFile?: string;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  debug: '\x1b[90m',
};
const RESET = '\x1b[0m';

export class Logger {
  private verbose: boolean;
  private logFile?: string;

  constructor(options: LoggerOptions = {}) {
    this.verbose = options.verbose ?? false;
    this.logFile = options.logFile;
  }

  private format(level: LogLevel, message: string, step?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      step,
      message,
    };
  }

  private write(entry: LogEntry): void {
    if (entry.level === 'debug' && !this.verbose) return;

    const color = LEVEL_COLORS[entry.level];
    const stepTag = entry.step ? ` [${entry.step}]` : '';
    const line = `${color}[${entry.level.toUpperCase()}]${RESET}${stepTag} ${entry.message}`;
    if (entry.level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }

    if (this.logFile) {
      const jsonLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(path.resolve(this.logFile), jsonLine, 'utf8');
    }
  }

  info(message: string, step?: string): void {
    this.write(this.format('info', message, step));
  }

  warn(message: string, step?: string): void {
    this.write(this.format('warn', message, step));
  }

  error(message: string, step?: string): void {
    this.write(this.format('error', message, step));
  }

  debug(message: string, step?: string): void {
    this.write(this.format('debug', message, step));
  }
}

export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}
