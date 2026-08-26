import { NextResponse } from 'next/server';
import {
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  type CloudFileRecord,
} from '../../../../_lib/cloud-store';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; file: string[] }> },
) {
  const session = requestSession(request);
  const { id, file } = await params;
  const name = file.join('/');
  const limitParam = Number(new URL(request.url).searchParams.get('limit') ?? 200_000);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : 200_000;
  try {
    const records = await readSessionJson<CloudFileRecord[]>(session.id, `files:${id}`, []);
    const record = records.find((candidate) => candidate.file.name === name);
    if (!record) return NextResponse.json({ error: 'file not found' }, { status: 404 });
    const bytes = record.encoding === 'base64' ? Buffer.from(record.content, 'base64') : Buffer.from(record.content, 'utf8');
    const fullText = bytes.toString('utf8');
    const text = fullText.slice(0, limit);
    return NextResponse.json({
      text,
      truncated: text.length < fullText.length,
      size: bytes.byteLength,
      limit,
      mime: record.file.mime,
      kind: record.file.kind,
      poweredPreview: { required: false, scannedBytes: bytes.byteLength, complete: true },
    });
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not preview project file' }, { status: 500 });
  }
}
