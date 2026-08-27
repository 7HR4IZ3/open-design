import type { Express, Request, Response } from 'express';
import { HOSTED_BASH_TOOL_ENDPOINT, type ToolTokenGrant } from '../tool-tokens.js';
import {
  HOSTED_BASH_DEFAULT_TIMEOUT_MS,
  HOSTED_BASH_MAX_TIMEOUT_MS,
  HostedBashManager,
} from '../hosted-bash.js';

type SendApiError = (
  res: Response,
  status: number,
  code: string,
  message: string,
  extras?: Record<string, unknown>,
) => void;

export interface RegisterHostedBashRoutesDeps {
  auth: {
    authorizeToolRequest: (
      req: Request,
      res: Response,
      operation: string,
      options?: { endpoint?: string },
    ) => ToolTokenGrant | null;
  };
  http: { sendApiError: SendApiError };
  bash: HostedBashManager;
  authorizeProjectRequest: (
    req: Request,
    res: Response,
    projectId: string,
    options: { mode: 'write'; capability: 'writeFiles' },
  ) => Promise<boolean>;
  authorizeProjectToolRequest: (
    res: Response,
    projectId: string,
    options: { mode: 'write'; capability: 'writeFiles' },
  ) => Promise<unknown>;
}

function parseRequest(body: unknown): {
  command: string;
  cwd?: string;
  stdin?: string;
  timeoutMs: number;
} | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'request body must be an object' };
  }
  const input = body as Record<string, unknown>;
  if (typeof input.command !== 'string' || input.command.trim().length === 0) {
    return { error: 'command is required' };
  }
  if (input.cwd !== undefined && typeof input.cwd !== 'string') {
    return { error: 'cwd must be a string' };
  }
  if (input.stdin !== undefined && typeof input.stdin !== 'string') {
    return { error: 'stdin must be a string' };
  }
  const timeoutMs = input.timeoutMs === undefined
    ? HOSTED_BASH_DEFAULT_TIMEOUT_MS
    : typeof input.timeoutMs === 'number'
      ? input.timeoutMs
      : Number.NaN;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > HOSTED_BASH_MAX_TIMEOUT_MS) {
    return { error: `timeoutMs must be an integer between 1 and ${HOSTED_BASH_MAX_TIMEOUT_MS}` };
  }
  return {
    command: input.command,
    ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
    ...(input.stdin === undefined ? {} : { stdin: input.stdin }),
    timeoutMs,
  };
}

async function execute(
  res: Response,
  sendApiError: SendApiError,
  bash: HostedBashManager,
  projectId: string,
  body: unknown,
): Promise<void> {
  const parsed = parseRequest(body);
  if ('error' in parsed) {
    sendApiError(res, 400, 'INVALID_BASH_REQUEST', parsed.error);
    return;
  }
  try {
    const result = await bash.execute(projectId, parsed.command, parsed);
    res.json({
      ok: result.exitCode === 0,
      backend: 'just-bash',
      persistence: 'daemon-memory-only',
      projectId,
      ...result,
    });
  } catch (error) {
    sendApiError(
      res,
      422,
      'BASH_EXECUTION_FAILED',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function registerHostedBashRoutes(
  app: Express,
  ctx: RegisterHostedBashRoutesDeps,
): void {
  app.post(HOSTED_BASH_TOOL_ENDPOINT, async (req, res) => {
    const grant = ctx.auth.authorizeToolRequest(req, res, 'bash:execute', {
      endpoint: HOSTED_BASH_TOOL_ENDPOINT,
    });
    if (!grant) return;
    if (!await ctx.authorizeProjectToolRequest(
      res,
      grant.projectId,
      { mode: 'write', capability: 'writeFiles' },
    )) return;
    await execute(res, ctx.http.sendApiError, ctx.bash, grant.projectId, req.body);
  });

  // The project-scoped endpoint is used by the local stdio MCP bridge, which
  // has workspace headers but is not itself spawned inside a run with
  // OD_TOOL_TOKEN. It still passes the normal project authorization gate.
  app.post('/api/projects/:id/bash', async (req, res) => {
    if (!await ctx.authorizeProjectRequest(
      req,
      res,
      req.params.id,
      { mode: 'write', capability: 'writeFiles' },
    )) return;
    await execute(res, ctx.http.sendApiError, ctx.bash, req.params.id, req.body);
  });
}
