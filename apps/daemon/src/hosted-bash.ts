import { Bash, InMemoryFs, type BashExecResult } from 'just-bash';

export const HOSTED_BASH_ROOT = '/workspace';
export const HOSTED_BASH_DEFAULT_TIMEOUT_MS = 30_000;
export const HOSTED_BASH_MAX_TIMEOUT_MS = 30_000;
export const HOSTED_BASH_MAX_SESSIONS = 64;
export const HOSTED_BASH_MAX_FILESYSTEM_BYTES = 64 * 1024 * 1024;
export const HOSTED_BASH_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

export interface HostedBashExecuteOptions {
  cwd?: string;
  timeoutMs?: number;
  stdin?: string;
}
export interface HostedBashResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  cwd: string;
  timedOut: boolean;
}

interface HostedBashSession {
  bash: Bash;
  lastUsedAt: number;
  queue: Promise<void>;
}

function resolveHostedCwd(cwd: string | undefined): string {
  if (!cwd) return HOSTED_BASH_ROOT;
  const candidate = cwd.startsWith('/')
    ? cwd
    : `${HOSTED_BASH_ROOT}/${cwd}`;
  const normalized = candidate
    .split('/')
    .filter((part) => part.length > 0 && part !== '.')
    .reduce<string[]>((parts, part) => {
      if (part === '..') {
        parts.pop();
      } else {
        parts.push(part);
      }
      return parts;
    }, []);
  const resolved = `/${normalized.join('/')}`;
  if (resolved !== HOSTED_BASH_ROOT && !resolved.startsWith(`${HOSTED_BASH_ROOT}/`)) {
    throw new Error(`cwd must stay inside ${HOSTED_BASH_ROOT}`);
  }
  return resolved;
}

function normalizeTimeout(timeoutMs: number | undefined): number {
  const value = timeoutMs ?? HOSTED_BASH_DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(value) || value < 1 || value > HOSTED_BASH_MAX_TIMEOUT_MS) {
    throw new Error(`timeoutMs must be an integer between 1 and ${HOSTED_BASH_MAX_TIMEOUT_MS}`);
  }
  return value;
}

function createBash(): Bash {
  const fs = new InMemoryFs({}, { maxTotalBytes: HOSTED_BASH_MAX_FILESYSTEM_BYTES });
  fs.mkdirSync(HOSTED_BASH_ROOT, { recursive: true });
  return new Bash({
    fs,
    cwd: HOSTED_BASH_ROOT,
    env: {
      HOME: HOSTED_BASH_ROOT,
      PATH: '/usr/bin:/bin',
      PWD: HOSTED_BASH_ROOT,
    },
    // `just-bash` never invokes the host shell for built-in commands. Keep
    // the hardened budget even though the HTTP route also applies a timeout.
    executionLimitProfile: 'hardened',
    executionLimits: {
      maxExecutionTimeMs: HOSTED_BASH_MAX_TIMEOUT_MS,
      maxFileSystemBytes: HOSTED_BASH_MAX_FILESYSTEM_BYTES,
      maxOutputSize: HOSTED_BASH_MAX_OUTPUT_BYTES,
    },
    // Network, Python, JavaScript, and host tools are intentionally absent in
    // this first in-memory implementation. R2 can be added behind the same
    // filesystem interface later without exposing the host process.
  });
}

function publicResult(result: BashExecResult, cwd: string, timedOut: boolean): HostedBashResult {
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: timedOut ? 124 : result.exitCode,
    cwd,
    timedOut,
  };
}

/**
 * Project-scoped, in-memory shell sessions.
 *
 * A session is intentionally shared across calls for one project so a tool
 * call such as `printf ... > file` can be followed by `cat file`. The queue
 * prevents concurrent agent turns from interleaving writes. All state is
 * lost when the daemon restarts; a remote filesystem can replace this store
 * later without changing the tool contract.
 */
export class HostedBashManager {
  readonly #sessions = new Map<string, HostedBashSession>();
  readonly #maxSessions: number;

  constructor(maxSessions = HOSTED_BASH_MAX_SESSIONS) {
    if (!Number.isSafeInteger(maxSessions) || maxSessions < 1) {
      throw new Error('maxSessions must be a positive integer');
    }
    this.#maxSessions = maxSessions;
  }

  async execute(
    projectId: string,
    script: string,
    options: HostedBashExecuteOptions = {},
  ): Promise<HostedBashResult> {
    if (!projectId.trim()) throw new Error('projectId is required');
    if (!script.trim()) throw new Error('command is required');
    const cwd = resolveHostedCwd(options.cwd);
    const timeoutMs = normalizeTimeout(options.timeoutMs);
    const session = this.#getSession(projectId);
    session.lastUsedAt = Date.now();

    const run = session.queue.then(async () => {
      let timedOut = false;
      const controller = new AbortController();
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      timer.unref?.();
      try {
        const result = await session.bash.exec(script, {
          cwd,
          rawScript: true,
          ...(options.stdin === undefined ? {} : { stdin: options.stdin }),
          signal: controller.signal,
        });
        return publicResult(result, cwd, timedOut);
      } catch (error) {
        if (timedOut) {
          return {
            stdout: '',
            stderr: `command timed out after ${timeoutMs}ms\n`,
            exitCode: 124,
            cwd,
            timedOut: true,
          } satisfies HostedBashResult;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    });
    session.queue = run.then(() => undefined, () => undefined);
    return await run;
  }

  clear(projectId?: string): void {
    if (projectId === undefined) {
      this.#sessions.clear();
      return;
    }
    this.#sessions.delete(projectId);
  }

  size(): number {
    return this.#sessions.size;
  }

  #getSession(projectId: string): HostedBashSession {
    const existing = this.#sessions.get(projectId);
    if (existing) return existing;

    if (this.#sessions.size >= this.#maxSessions) {
      const oldest = [...this.#sessions.entries()]
        .sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt)[0];
      if (oldest) this.#sessions.delete(oldest[0]);
    }

    const session: HostedBashSession = {
      bash: createBash(),
      lastUsedAt: Date.now(),
      queue: Promise.resolve(),
    };
    this.#sessions.set(projectId, session);
    return session;
  }
}
