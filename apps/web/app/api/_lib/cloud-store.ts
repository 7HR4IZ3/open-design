import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { ProjectFile, WorkspaceCollabContext } from '@open-design/contracts';

export const CLOUD_PERSONAL_WORKSPACE_ID = 'personal-vercel';
export const CLOUD_PERSONAL_MEMBER_ID = 'member-vercel';

export type CloudProject = {
  id: string;
  name: string;
  skillId: string | null;
  designSystemId: string | null;
  createdAt: number;
  updatedAt: number;
  pendingPrompt?: string;
  metadata?: Record<string, unknown>;
  appliedPluginSnapshotId?: string;
  customInstructions?: string;
  workspaceId?: string | null;
  workspaceVisibility?: 'personal' | 'team';
};

export type CloudConversation = {
  id: string;
  projectId: string;
  title: string | null;
  sessionMode?: string;
  messageCount?: number;
  createdAt: number;
  updatedAt: number;
  latestRun?: {
    status: string;
    startedAt?: number;
    endedAt?: number;
    durationMs?: number;
  };
};

export type CloudMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  [key: string]: unknown;
};

export type CloudFileRecord = {
  file: ProjectFile;
  content: string;
  encoding?: 'base64';
};

export class CloudStoreUnavailable extends Error {
  constructor() {
    super('Cloud storage is not configured. Provision a Vercel KV/Upstash store and set KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.');
    this.name = 'CloudStoreUnavailable';
  }
}

function storageConfig(): { url: string; token: string } {
  const url = (
    process.env.KV_REST_API_URL
    ?? process.env.UPSTASH_REDIS_REST_URL
  )?.replace(/\/$/, '');
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
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

export function cloudPersonalWorkspaceContext(): WorkspaceCollabContext {
  return {
    workspaceId: CLOUD_PERSONAL_WORKSPACE_ID,
    workspaceType: 'personal',
    workspaceMemberId: CLOUD_PERSONAL_MEMBER_ID,
    role: 'owner',
    memberStatus: 'active',
    lifecycleState: 'active',
    billingState: 'free',
    planId: null,
    providerMode: 'personal_byok',
    seatSummary: { seatLimit: 1, usedSeats: 1, availableSeats: 0, isSeatFull: false },
    permissions: {
      canManageMembers: false,
      canManageBilling: false,
      canInviteMembers: false,
      canManageAutoRecharge: false,
      canShareProjects: false,
      canWriteSyncedFiles: false,
      canViewWorkspaceSettings: false,
      canManageSharedResources: false,
    },
    workspaceName: 'Personal workspace',
  };
}

export async function readSessionJson<T>(sessionId: string, name: string, fallback: T): Promise<T> {
  const value = await command<string | null>('GET', `open-design:${sessionId}:${name}`);
  return value ? JSON.parse(value) as T : fallback;
}

export async function writeSessionJson(sessionId: string, name: string, value: unknown): Promise<void> {
  await command('SET', `open-design:${sessionId}:${name}`, JSON.stringify(value));
}

export async function deleteSessionJson(sessionId: string, name: string): Promise<void> {
  await command('DEL', `open-design:${sessionId}:${name}`);
}
