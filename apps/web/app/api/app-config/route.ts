import { NextResponse } from 'next/server';
import type { AppConfigPrefs } from '@open-design/contracts';
import {
  attachSession,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
} from '../_lib/cloud-store';

export const runtime = 'nodejs';

const SECRET_ENV_KEYS = new Set([
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'CODEX_API_KEY',
  'OPENAI_API_KEY',
]);

function sanitizePrefs(value: unknown): AppConfigPrefs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const prefs = { ...input } as AppConfigPrefs;
  if (input.agentCliEnv && typeof input.agentCliEnv === 'object' && !Array.isArray(input.agentCliEnv)) {
    prefs.agentCliEnv = Object.fromEntries(
      Object.entries(input.agentCliEnv as Record<string, unknown>).map(([agentId, env]) => [
        agentId,
        env && typeof env === 'object' && !Array.isArray(env)
          ? Object.fromEntries(
              Object.entries(env as Record<string, unknown>)
                .filter(([key]) => !SECRET_ENV_KEYS.has(key))
                .filter(([, entry]) => typeof entry === 'string'),
            )
          : {},
      ]),
    ) as AppConfigPrefs['agentCliEnv'];
  }
  return prefs;
}

function unavailable(error: unknown): NextResponse | null {
  if (error instanceof CloudStoreUnavailable) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  return null;
}

export async function GET(request: Request) {
  const session = requestSession(request);
  try {
    const config = await readSessionJson<AppConfigPrefs>(session.id, 'app-config', {});
    return attachSession(NextResponse.json({ config }), session);
  } catch (error) {
    const response = unavailable(error);
    if (response) return response;
    console.error(error);
    return NextResponse.json({ error: 'Could not load app config' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = requestSession(request);
  try {
    const incoming = sanitizePrefs(await request.json());
    const current = await readSessionJson<AppConfigPrefs>(session.id, 'app-config', {});
    const config: AppConfigPrefs = { ...current, ...incoming };
    await writeSessionJson(session.id, 'app-config', config);
    return attachSession(NextResponse.json({ config }), session);
  } catch (error) {
    const response = unavailable(error);
    if (response) return response;
    console.error(error);
    return NextResponse.json({ error: 'Could not save app config' }, { status: 500 });
  }
}
