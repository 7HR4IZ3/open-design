import { NextResponse } from 'next/server';
import type { ProjectFile } from '@open-design/contracts';
import {
  attachSession,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
  type CloudFileRecord,
  type CloudProject,
} from '../../../_lib/cloud-store';

export const runtime = 'nodejs';

function normalizeFileName(value: string): string | null {
  const name = value.trim().replaceAll('\\', '/');
  if (
    !name
    || name.startsWith('/')
    || name.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) return null;
  return name;
}

function fileInfo(name: string, size: number, mtime: number): ProjectFile {
  const lower = name.toLowerCase();
  const mime = lower.endsWith('.html') || lower.endsWith('.htm')
    ? 'text/html; charset=utf-8'
    : lower.endsWith('.css')
      ? 'text/css; charset=utf-8'
      : lower.endsWith('.js') || lower.endsWith('.mjs')
        ? 'text/javascript; charset=utf-8'
        : lower.endsWith('.json')
          ? 'application/json; charset=utf-8'
          : lower.endsWith('.svg')
            ? 'image/svg+xml'
            : lower.endsWith('.png')
              ? 'image/png'
              : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
                ? 'image/jpeg'
                : lower.endsWith('.gif')
                  ? 'image/gif'
                  : lower.endsWith('.webp')
                    ? 'image/webp'
                    : lower.endsWith('.pdf')
                      ? 'application/pdf'
                      : 'text/plain; charset=utf-8';
  const kind: ProjectFile['kind'] =
    mime.startsWith('text/html') ? 'html'
      : mime.startsWith('image/') ? 'image'
        : mime === 'application/pdf' ? 'pdf'
          : lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.jsx')
            ? 'code'
            : 'text';
  return { name, path: name, type: 'file', size, mtime, kind, mime };
}

async function ensureProject(sessionId: string, projectId: string): Promise<boolean> {
  const projects = await readSessionJson<CloudProject[]>(sessionId, 'projects', []);
  return projects.some((project) => project.id === projectId);
}

async function saveFiles(
  sessionId: string,
  projectId: string,
  incoming: CloudFileRecord[],
): Promise<CloudFileRecord[]> {
  const existing = await readSessionJson<CloudFileRecord[]>(sessionId, `files:${projectId}`, []);
  const next = [...existing];
  for (const record of incoming) {
    const index = next.findIndex((candidate) => candidate.file.name === record.file.name);
    if (index >= 0) next[index] = record;
    else next.push(record);
  }
  await writeSessionJson(sessionId, `files:${projectId}`, next);
  return next;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    if (!(await ensureProject(session.id, id))) return NextResponse.json({ error: 'project not found' }, { status: 404 });
    const records = await readSessionJson<CloudFileRecord[]>(session.id, `files:${id}`, []);
    return attachSession(NextResponse.json({ files: records.map((record) => record.file) }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not load project files' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    if (!(await ensureProject(session.id, id))) return NextResponse.json({ error: 'project not found' }, { status: 404 });
    const contentType = request.headers.get('content-type') ?? '';
    const incoming: CloudFileRecord[] = [];
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const directory = typeof form.get('dir') === 'string' ? (form.get('dir') as string).trim() : '';
      const entries = [...form.getAll('files'), ...form.getAll('file')].filter(
        (entry): entry is File => typeof File !== 'undefined' && entry instanceof File,
      );
      for (const entry of entries) {
        const rawName = typeof form.get('name') === 'string' && entries.length === 1
          ? form.get('name') as string
          : entry.name;
        const name = normalizeFileName(directory ? `${directory}/${rawName}` : rawName);
        if (!name) return NextResponse.json({ error: `invalid file name: ${rawName}` }, { status: 400 });
        const bytes = Buffer.from(await entry.arrayBuffer());
        incoming.push({ file: fileInfo(name, bytes.byteLength, Date.now()), content: bytes.toString('base64'), encoding: 'base64' });
      }
      if (incoming.length === 0) return NextResponse.json({ error: 'file is required' }, { status: 400 });
    } else {
      const body = await request.json() as {
        name?: unknown;
        content?: unknown;
        encoding?: unknown;
        artifactManifest?: unknown;
      };
      if (typeof body.name !== 'string' || typeof body.content !== 'string') {
        return NextResponse.json({ error: 'name and content are required' }, { status: 400 });
      }
      const name = normalizeFileName(body.name);
      if (!name) return NextResponse.json({ error: 'invalid file name' }, { status: 400 });
      const bytes = body.encoding === 'base64'
        ? Buffer.from(body.content, 'base64')
        : Buffer.from(body.content, 'utf8');
      const file = fileInfo(name, bytes.byteLength, Date.now());
      if (body.artifactManifest && typeof body.artifactManifest === 'object') {
        file.artifactManifest = body.artifactManifest as ProjectFile['artifactManifest'];
      }
      incoming.push({ file, content: bytes.toString('base64'), encoding: 'base64' });
    }
    const allFiles = await saveFiles(session.id, id, incoming);
    const response = incoming.length === 1
      ? NextResponse.json({ file: incoming[0]!.file, files: allFiles.map((record) => record.file) })
      : NextResponse.json({ files: incoming.map((record) => record.file) });
    return attachSession(response, session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not save project file' }, { status: 500 });
  }
}
