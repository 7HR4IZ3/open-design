import { Bash, InMemoryFs, type BashExecResult } from 'just-bash';
import type { ProjectStorage } from './storage/project-storage.js';

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
  fs: InMemoryFs;
  lastUsedAt: number;
  queue: Promise<void>;
  ready: Promise<void>;
  persistedPaths: Set<string>;
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

function createBash(): { bash: Bash; fs: InMemoryFs } {
  const fs = new InMemoryFs({}, { maxTotalBytes: HOSTED_BASH_MAX_FILESYSTEM_BYTES });
  fs.mkdirSync(HOSTED_BASH_ROOT, { recursive: true });
  const bash = new Bash({
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
  return { bash, fs };
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
 * prevents concurrent agent turns from interleaving writes. In local mode
 * state is lost when the daemon restarts; when a ProjectStorage adapter is
 * configured, the workspace is hydrated and flushed through that adapter.
 */
export interface HostedBashManagerOptions {
  maxSessions?: number;
  storage?: ProjectStorage | null;
}

export class HostedBashManager {
  readonly #sessions = new Map<string, HostedBashSession>();
  readonly #maxSessions: number;
  readonly #storage: ProjectStorage | null;

  constructor(options: number | HostedBashManagerOptions = HOSTED_BASH_MAX_SESSIONS) {
    const maxSessions = typeof options === 'number' ? options : options.maxSessions ?? HOSTED_BASH_MAX_SESSIONS;
    this.#storage = typeof options === 'number' ? null : options.storage ?? null;
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
    const session = await this.#getSession(projectId);
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
        await this.#flushSession(projectId, session);
        return publicResult(result, cwd, timedOut);
      } catch (error) {
        // just-bash normally returns a non-zero result, but syntax/runtime
        // failures can still reject. Flush the virtual FS in that path too so
        // a write performed before the failure is not silently lost.
        try {
          await this.#flushSession(projectId, session);
        } catch (persistenceError) {
          throw persistenceError;
        }
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

  /** Identifies whether the workspace survives daemon restarts. */
  get persistence(): 'supabase-storage' | 'daemon-memory-only' {
    return this.#storage ? 'supabase-storage' : 'daemon-memory-only';
  }

  async #getSession(projectId: string): Promise<HostedBashSession> {
    const existing = this.#sessions.get(projectId);
    if (existing) {
      await existing.ready;
      return existing;
    }

    if (this.#sessions.size >= this.#maxSessions) {
      const oldest = [...this.#sessions.entries()]
        .sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt)[0];
      if (oldest) this.#sessions.delete(oldest[0]);
    }

    const created = createBash();
    const session: HostedBashSession = {
      bash: created.bash,
      fs: created.fs,
      lastUsedAt: Date.now(),
      queue: Promise.resolve(),
      ready: Promise.resolve(),
      persistedPaths: new Set(),
    };
    this.#sessions.set(projectId, session);
    session.ready = this.#hydrateSession(projectId, session).catch((error) => {
      if (this.#sessions.get(projectId) === session) this.#sessions.delete(projectId);
      throw error;
    });
    await session.ready;
    return session;
  }

  async #hydrateSession(projectId: string, session: HostedBashSession): Promise<void> {
    if (!this.#storage) return;
    const files = await this.#storage.listFiles(projectId);
    for (const file of files) {
      const rel = normalizeWorkspaceRelativePath(file.path);
      const body = await this.#storage.readFile(projectId, rel);
      await session.fs.writeFile(`${HOSTED_BASH_ROOT}/${rel}`, body);
      session.persistedPaths.add(rel);
    }
  }

  async #flushSession(projectId: string, session: HostedBashSession): Promise<void> {
    if (!this.#storage) return;
    const currentPaths = new Set<string>();
    for (const absolutePath of session.fs.getAllPaths()) {
      if (absolutePath === HOSTED_BASH_ROOT || !absolutePath.startsWith(`${HOSTED_BASH_ROOT}/`)) continue;
      let stat;
      try {
        stat = await session.fs.stat(absolutePath);
      } catch {
        continue;
      }
      if (!stat.isFile) continue;
      const rel = normalizeWorkspaceRelativePath(absolutePath.slice(`${HOSTED_BASH_ROOT}/`.length));
      const body = Buffer.from(await session.fs.readFileBuffer(absolutePath));
      await this.#storage.writeFile(projectId, rel, body);
      currentPaths.add(rel);
    }
    for (const previousPath of session.persistedPaths) {
      if (!currentPaths.has(previousPath)) {
        await this.#storage.deleteFile(projectId, previousPath);
      }
    }
    session.persistedPaths = currentPaths;
  }
}

function normalizeWorkspaceRelativePath(value: string): string {
  const normalized = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    throw new Error(`invalid hosted workspace path: ${value}`);
  }
  return normalized;
}
