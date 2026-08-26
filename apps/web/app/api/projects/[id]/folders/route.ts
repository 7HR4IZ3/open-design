import { NextResponse } from 'next/server';
import type { ProjectFolder } from '@open-design/contracts';
import {
  attachSession,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
  type CloudFileRecord,
} from '../../../_lib/cloud-store';

export const runtime = 'nodejs';

function foldersFromFiles(records: CloudFileRecord[]): ProjectFolder[] {
  const names = new Set<string>();
  for (const record of records) {
    const parts = record.file.name.split('/');
    for (let i = 1; i < parts.length; i += 1) names.add(parts.slice(0, i).join('/'));
  }
  return [...names].sort().map((path) => ({
    name: path.slice(path.lastIndexOf('/') + 1),
    path,
    type: 'dir' as const,
    size: 0,
    mtime: Date.now(),
  }));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    const records = await readSessionJson<CloudFileRecord[]>(session.id, `files:${id}`, []);
    return attachSession(NextResponse.json({ folders: foldersFromFiles(records) }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not load project folders' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    const body = await request.json() as { name?: unknown };
    const path = typeof body.name === 'string' ? body.name.trim().replaceAll('\\', '/') : '';
    if (!path || path.startsWith('/') || path.split('/').some((part) => !part || part === '.' || part === '..')) {
      return NextResponse.json({ error: 'invalid folder name' }, { status: 400 });
    }
    const folder: ProjectFolder = { name: path.slice(path.lastIndexOf('/') + 1), path, type: 'dir', size: 0, mtime: Date.now() };
    return attachSession(NextResponse.json({ folder }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: 'Could not create project folder' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    const body = await request.json() as { path?: unknown };
    const path = typeof body.path === 'string' ? body.path.trim().replaceAll('\\', '/') : '';
    if (!path || path.startsWith('/') || path.split('/').some((part) => !part || part === '.' || part === '..')) {
      return NextResponse.json({ error: 'invalid folder path' }, { status: 400 });
    }
    const records = await readSessionJson<CloudFileRecord[]>(session.id, `files:${id}`, []);
    const prefix = `${path}/`;
    const next = records.filter((record) => record.file.name !== path && !record.file.name.startsWith(prefix));
    await writeSessionJson(session.id, `files:${id}`, next);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not delete project folder' }, { status: 500 });
  }
}
