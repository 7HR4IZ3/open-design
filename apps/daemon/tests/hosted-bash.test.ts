import type { Express } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleMcpToolCall, localMcpToolDefinitions } from '../src/mcp.js';
import {
  HOSTED_BASH_ROOT,
  HostedBashManager,
} from '../src/hosted-bash.js';
import type { ProjectStorage, ProjectFileMeta } from '../src/storage/project-storage.js';
import { registerHostedBashRoutes } from '../src/routes/hosted-bash.js';

afterEach(() => {
  vi.unstubAllGlobals();
});
describe('hosted just-bash workspace', () => {
  it('keeps project state in memory across calls and isolates projects', async () => {
    const manager = new HostedBashManager();

    const write = await manager.execute(
      'project-a',
      'mkdir -p src && printf "hello" > src/index.html',
    );
    expect(write).toMatchObject({
      exitCode: 0,
      cwd: HOSTED_BASH_ROOT,
      timedOut: false,
    });

    const read = await manager.execute('project-a', 'cat src/index.html');
    expect(read.stdout).toBe('hello');
    expect(read.exitCode).toBe(0);

    const isolated = await manager.execute('project-b', 'cat src/index.html');
    expect(isolated.exitCode).not.toBe(0);
    expect(isolated.stderr).toContain('No such file');

    const native = await manager.execute('project-a', 'node --version');
    expect(native.exitCode).not.toBe(0);
  });

  it('does not escape the virtual workspace through cwd', async () => {
    const manager = new HostedBashManager();

    await expect(manager.execute('project-a', 'pwd', { cwd: '../../tmp' })).rejects.toThrow(
      `cwd must stay inside ${HOSTED_BASH_ROOT}`,
    );
  });

  it('hydrates and flushes a durable project storage adapter', async () => {
    const files = new Map([['existing.txt', Buffer.from('before')]]);
    const storage: ProjectStorage = {
      async readFile(_projectId, relpath) {
        const body = files.get(relpath);
        if (!body) throw Object.assign(new Error('missing'), { code: 'NOT_FOUND' });
        return Buffer.from(body);
      },
      async writeFile(_projectId, relpath, body): Promise<ProjectFileMeta> {
        files.set(relpath, Buffer.from(body));
        return { path: relpath, size: body.byteLength, mtimeMs: Date.now() };
      },
      async listFiles() {
        return [...files].map(([path, body]) => ({ path, size: body.byteLength, mtimeMs: Date.now() }));
      },
      async deleteFile(_projectId, relpath) {
        files.delete(relpath);
      },
      async statFile(_projectId, relpath) {
        const body = files.get(relpath);
        return body ? { path: relpath, size: body.byteLength, mtimeMs: Date.now() } : null;
      },
    };
    const manager = new HostedBashManager({ storage });

    const read = await manager.execute('project-a', 'cat existing.txt');
    expect(read.stdout).toBe('before');
    await manager.execute('project-a', 'printf after > next.txt && rm existing.txt');

    expect(files.get('next.txt')?.toString()).toBe('after');
    expect(files.has('existing.txt')).toBe(false);
  });
});

describe('hosted bash routes and MCP proxy', () => {
  it('routes the run-scoped tool to one persistent just-bash manager', async () => {
    const routes = new Map<string, (req: any, res: any) => Promise<void>>();
    const app = {
      post(path: string, handler: (req: any, res: any) => Promise<void>) {
        routes.set(path, handler);
      },
    } as unknown as Express;
    const authorizeToolRequest = vi.fn(() => ({
      token: 'token',
      runId: 'run-1',
      projectId: 'project-a',
      allowedEndpoints: [],
      allowedOperations: [],
      issuedAt: '',
      expiresAt: '',
    }));
    const authorizeProjectToolRequest = vi.fn(async () => ({}));
    const sendApiError = vi.fn();
    const json = vi.fn();
    const manager = new HostedBashManager();

    registerHostedBashRoutes(app, {
      auth: { authorizeToolRequest },
      http: { sendApiError },
      bash: manager,
      authorizeProjectRequest: vi.fn(async () => true),
      authorizeProjectToolRequest,
    });

    const handler = routes.get('/api/tools/bash');
    if (!handler) throw new Error('hosted bash route was not registered');
    await handler({ body: { command: 'printf route > route.txt' } }, { json });
    await handler({ body: { command: 'cat route.txt' } }, { json });

    expect(authorizeToolRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'bash:execute',
      { endpoint: '/api/tools/bash' },
    );
    expect(authorizeProjectToolRequest).toHaveBeenCalledTimes(2);
    expect(json).toHaveBeenLastCalledWith(expect.objectContaining({
      ok: true,
      backend: 'just-bash',
      persistence: 'daemon-memory-only',
      stdout: 'route',
    }));
    expect(sendApiError).not.toHaveBeenCalled();
  });

  it('proxies the public MCP tool to the project bash route', async () => {
    const base = 'http://127.0.0.1:19001';
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.endsWith('/api/workspace/directory')) {
        return new Response(JSON.stringify({ items: [], activeWorkspaceId: null }), { status: 200 });
      }
      return new Response(JSON.stringify({
        ok: true,
        backend: 'just-bash',
        stdout: 'hello\n',
        stderr: '',
        exitCode: 0,
        cwd: HOSTED_BASH_ROOT,
        timedOut: false,
      }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await handleMcpToolCall(base, 'run_bash', {
      project: '00000000-0000-0000-0000-000000000001',
      command: 'printf hello',
    });
    const body = JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `${base}/api/projects/00000000-0000-0000-0000-000000000001/bash`,
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      command: 'printf hello',
    });
    expect(body).toMatchObject({ ok: true, backend: 'just-bash', stdout: 'hello\n' });
    expect(localMcpToolDefinitions().some((tool) => tool.name === 'run_bash')).toBe(true);
  });
});
