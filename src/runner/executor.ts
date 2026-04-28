import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';

/**
 * Represents the result of a single command execution.
 */
export interface ExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  attempts: number;
}

/**
 * Options for executing a command with retry support.
 */
export interface ExecuteOptions {
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  env?: Record<string, string>;
  cwd?: string;
}

const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Sleeps for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a single shell command synchronously, capturing stdout and stderr.
 * Returns an ExecutionResult regardless of success or failure.
 */
function runOnce(
  command: string,
  options: ExecuteOptions
): { stdout: string; stderr: string; exitCode: number } {
  const execOptions: ExecSyncOptionsWithStringEncoding = {
    encoding: 'utf8',
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    env: { ...process.env, ...(options.env ?? {}) },
    cwd: options.cwd ?? process.cwd(),
    stdio: 'pipe',
  };

  try {
    const stdout = execSync(command, execOptions);
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (err: unknown) {
    const error = err as {
      status?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      stdout: (error.stdout ?? '').trim(),
      stderr: (error.stderr ?? error.message ?? '').trim(),
      exitCode: error.status ?? 1,
    };
  }
}

/**
 * Executes a shell command with optional retry logic.
 *
 * @param command - The shell command string to execute.
 * @param options - Execution options including retries and delay.
 * @returns A promise resolving to an ExecutionResult.
 */
export async function executeCommand(
  command: string,
  options: ExecuteOptions = {}
): Promise<ExecutionResult> {
  const maxAttempts = (options.retries ?? 0) + 1;
  const retryDelay = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  let lastResult: ReturnType<typeof runOnce> = {
    stdout: '',
    stderr: '',
    exitCode: 1,
  };

  const start = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = runOnce(command, options);

    if (lastResult.exitCode === 0) {
      return {
        command,
        exitCode: lastResult.exitCode,
        stdout: lastResult.stdout,
        stderr: lastResult.stderr,
        durationMs: Date.now() - start,
        attempts: attempt,
      };
    }

    if (attempt < maxAttempts) {
      console.warn(
        `[taskpipe] Command failed (attempt ${attempt}/${maxAttempts}), retrying in ${retryDelay}ms...`
      );
      await sleep(retryDelay);
    }
  }

  return {
    command,
    exitCode: lastResult.exitCode,
    stdout: lastResult.stdout,
    stderr: lastResult.stderr,
    durationMs: Date.now() - start,
    attempts: maxAttempts,
  };
}
