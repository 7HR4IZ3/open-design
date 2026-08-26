import { NextResponse } from 'next/server';
import {
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
  type CloudFileRecord,
} from '../../../../_lib/cloud-store';

export const runtime = 'nodejs';

function safePath(parts: string[]): string | null {
  const path = parts.join('/').replaceAll('\\', '/');
  if (!path || path.startsWith('/') || path.split('/').some((part) => !part || part === '.' || part === '..')) return null;
  return path;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; file: string[] }> },
) {
  const session = requestSession(request);
  const { id, file } = await params;
  const name = safePath(file);
  if (!name) return NextResponse.json({ error: 'invalid file path' }, { status: 400 });
  try {
    const records = await readSessionJson<CloudFileRecord[]>(session.id, `files:${id}`, []);
    const record = records.find((candidate) => candidate.file.name === name);
    if (!record) return NextResponse.json({ error: 'file not found' }, { status: 404 });
    const bytes = record.encoding === 'base64' ? Buffer.from(record.content, 'base64') : Buffer.from(record.content, 'utf8');
    return new Response(new Uint8Array(bytes), {
      headers: {
        'content-type': record.file.mime,
        'cache-control': 'no-store',
        'content-length': String(bytes.byteLength),
      },
    });
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not load project file' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; file: string[] }> },
) {
  const session = requestSession(request);
  const { id, file } = await params;
  const name = safePath(file);
  if (!name) return NextResponse.json({ error: 'invalid file path' }, { status: 400 });
  try {
    const records = await readSessionJson<CloudFileRecord[]>(session.id, `files:${id}`, []);
    const next = records.filter((candidate) => candidate.file.name !== name);
    if (next.length === records.length) return NextResponse.json({ error: 'file not found' }, { status: 404 });
    await writeSessionJson(session.id, `files:${id}`, next);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not delete project file' }, { status: 500 });
  }
}
