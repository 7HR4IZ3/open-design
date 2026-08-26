import { NextResponse } from 'next/server';
import {
  attachSession,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
  type CloudFileRecord,
} from '../../../../_lib/cloud-store';

export const runtime = 'nodejs';

function normalize(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim().replaceAll('\\', '/');
  return path && !path.startsWith('/') && !path.split('/').some((part) => !part || part === '.' || part === '..')
    ? path
    : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    const body = await request.json() as { from?: unknown; to?: unknown };
    const from = normalize(body.from);
    const to = normalize(body.to);
    if (!from || !to) return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
    const records = await readSessionJson<CloudFileRecord[]>(session.id, `files:${id}`, []);
    const source = records.find((record) => record.file.name === from);
    if (!source) return NextResponse.json({ error: 'file not found' }, { status: 404 });
    if (records.some((record) => record.file.name === to)) return NextResponse.json({ error: 'target file already exists' }, { status: 409 });
    const next = records.map((record) => record === source
      ? { ...record, file: { ...record.file, name: to, path: to, mtime: Date.now() } }
      : record);
    await writeSessionJson(session.id, `files:${id}`, next);
    return attachSession(NextResponse.json({ file: next.find((record) => record.file.name === to)!.file, oldName: from, newName: to }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not rename project file' }, { status: 500 });
  }
}
