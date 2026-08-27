import { resolveDaemonUrl } from './daemon-url.js';

interface ParsedOptions {
  command?: string;
  project?: string;
  cwd?: string;
  timeoutMs?: number;
  daemonUrl?: string;
  json: boolean;
  help: boolean;
}

interface BashResponse {
  ok?: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  [key: string]: unknown;
}

const BASH_USAGE = `Usage:
  od tools bash --script <shell-script> [options]
  od tools bash --command <shell-command> [options]
  printf '...script...' | od tools bash [options]

Runs the script through OpenDesign's hosted just-bash interpreter. This is
not the host shell: it cannot access the daemon's disk, network, or native
processes. The virtual workspace is shared by calls for the same project
until the daemon restarts.

Options:
  --project <id>       Project id (defaults to OD_PROJECT_ID when no tool token is present)
  --cwd <path>         Virtual cwd under /workspace (default: /workspace)
  --timeout-ms <n>     Execution timeout, 1–30000ms (default: 30000)
  --json               Print the complete result as one JSON object
  --daemon-url <url>   Override the daemon URL

Agent invocation:
  "$OD_NODE_BIN" "$OD_BIN" tools bash --script "$SCRIPT"
`;

function fail(message: string): { exitCode: number } {
  process.stderr.write(`${JSON.stringify({ ok: false, error: { message } })}\n`);
  return { exitCode: 1 };
}

function parseOptions(args: string[]): ParsedOptions | { error: string } {
  const options: ParsedOptions = { json: false, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--script' || arg === '--command') {
      const value = args[++index];
      if (!value) return { error: `${arg} requires a value` };
      options.command = value;
    } else if (arg === '--project') {
      const value = args[++index];
      if (!value) return { error: '--project requires a value' };
      options.project = value;
    } else if (arg === '--cwd') {
      const value = args[++index];
      if (!value) return { error: '--cwd requires a value' };
      options.cwd = value;
    } else if (arg === '--timeout-ms') {
      const value = args[++index];
      const parsed = value === undefined ? Number.NaN : Number.parseInt(value, 10);
      if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 30_000) {
        return { error: '--timeout-ms must be an integer between 1 and 30000' };
      }
      options.timeoutMs = parsed;
    } else if (arg === '--daemon-url') {
      const value = args[++index];
      if (!value) return { error: '--daemon-url requires a value' };
      // Keep this as an option-local environment override so resolveDaemonUrl
      // retains its existing sidecar discovery behavior.
      options.daemonUrl = value;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else {
      return { error: `unknown option: ${arg}` };
    }
  }
  return options;
}

function endpoint(baseUrl: string, pathname: string): string {
  return `${baseUrl.replace(/\/+$/u, '')}${pathname}`;
}

async function readCommand(): Promise<string> {
  let command = '';
  for await (const chunk of process.stdin) {
    command += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  }
  return command;
}

export async function runBashToolCli(args: string[]): Promise<{ exitCode: number }> {
  const parsed = parseOptions(args);
  if ('error' in parsed) return fail(parsed.error);
  if (parsed.help) {
    process.stdout.write(BASH_USAGE);
    return { exitCode: 0 };
  }

  const command = parsed.command ?? await readCommand();
  if (!command.trim()) return fail('a shell script is required via --script, --command, or stdin');

  const token = process.env.OD_TOOL_TOKEN;
  const project = parsed.project ?? process.env.OD_PROJECT_ID;
  if (!token && !project) {
    return fail('project id is required when OD_TOOL_TOKEN is not available; pass --project or set OD_PROJECT_ID');
  }

  const daemonUrl = await resolveDaemonUrl(
    parsed.daemonUrl === undefined ? {} : { flagUrl: parsed.daemonUrl },
  );
  const path = token
    ? '/api/tools/bash'
    : `/api/projects/${encodeURIComponent(project as string)}/bash`;
  let response: Response;
  try {
    response = await fetch(endpoint(daemonUrl, path), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        command,
        ...(parsed.cwd === undefined ? {} : { cwd: parsed.cwd }),
        ...(parsed.timeoutMs === undefined ? {} : { timeoutMs: parsed.timeoutMs }),
      }),
    });
  } catch (error) {
    return fail(`could not reach OpenDesign daemon: ${error instanceof Error ? error.message : String(error)}`);
  }

  const text = await response.text();
  let body: BashResponse;
  try {
    body = JSON.parse(text) as BashResponse;
  } catch {
    return fail(`daemon ${response.status}: ${text || response.statusText}`);
  }
  if (!response.ok) {
    const error = body.error;
    return fail(
      `daemon ${response.status}: ${
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : text || response.statusText
      }`,
    );
  }

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(body)}\n`);
  } else {
    if (typeof body.stdout === 'string' && body.stdout.length > 0) process.stdout.write(body.stdout);
    if (typeof body.stderr === 'string' && body.stderr.length > 0) process.stderr.write(body.stderr);
  }
  return { exitCode: Number.isSafeInteger(body.exitCode) ? Number(body.exitCode) : body.ok === false ? 1 : 0 };
}
