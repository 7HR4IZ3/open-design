import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

export type CloudConversation = {
  id: string;
  projectId: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
};

export type CloudProject = {
  id: string;
  name: string;
  skillId: string | null;
  designSystemId: string | null;
  createdAt: number;
  updatedAt: number;
  pendingPrompt?: string;
};

export class CloudStoreUnavailable extends Error {
  constructor() {
    super('Cloud storage is not configured. Provision a Vercel KV/Upstash store and set KV_REST_API_URL and KV_REST_API_TOKEN.');
    this.name = 'CloudStoreUnavailable';
  }
}

function storageConfig(): { url: string; token: string } {
  const url = process.env.KV_REST_API_URL?.replace(/\/$/, '');
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new CloudStoreUnavailable();
  return { url, token };
}

async function command<T>(...args: string[]): Promise<T> {
  const { url, token } = storageConfig();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Cloud storage returned ${response.status}`);
  const body = await response.json() as { result?: unknown };
  return body.result as T;
}

export function requestSession(request: Request): { id: string; isNew: boolean } {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)open-design-session=([^;]+)/);
  return match?.[1]
    ? { id: decodeURIComponent(match[1]), isNew: false }
    : { id: randomUUID(), isNew: true };
}

export function attachSession(response: NextResponse, session: { id: string; isNew: boolean }): NextResponse {
  if (session.isNew) {
    response.cookies.set(
      'open-design-session',
      encodeURIComponent(session.id),
      { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 31536000 },
    );
  }
  return response;
}

export async function readSessionJson<T>(sessionId: string, name: string, fallback: T): Promise<T> {
  const value = await command<string | null>('GET', `open-design:${sessionId}:${name}`);
  return value ? JSON.parse(value) as T : fallback;
}

export async function writeSessionJson(sessionId: string, name: string, value: unknown): Promise<void> {
  await command('SET', `open-design:${sessionId}:${name}`, JSON.stringify(value));
}
