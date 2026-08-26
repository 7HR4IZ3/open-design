import { NextResponse } from 'next/server';
import {
  attachSession,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
  type CloudProject,
} from '../_lib/cloud-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = requestSession(request);
  try {
    const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
    return attachSession(NextResponse.json({ projects }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not load projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = requestSession(request);
  try {
    const body = await request.json() as { id?: string; name?: string; skillId?: string | null; designSystemId?: string | null; pendingPrompt?: string };
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const now = Date.now();
    const project: CloudProject = {
      id: body.id?.trim() || crypto.randomUUID(),
      name,
      skillId: body.skillId ?? null,
      designSystemId: body.designSystemId ?? null,
      createdAt: now,
      updatedAt: now,
      ...(body.pendingPrompt ? { pendingPrompt: body.pendingPrompt } : {}),
    };
    const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
    projects.unshift(project);
    await writeSessionJson(session.id, 'projects', projects);
    const conversationId = crypto.randomUUID();
    await writeSessionJson(session.id, `conversations:${project.id}`, [{ id: conversationId, projectId: project.id, title: null, createdAt: now, updatedAt: now }]);
    return attachSession(NextResponse.json({ project, conversationId }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not create project' }, { status: 500 });
  }
}
