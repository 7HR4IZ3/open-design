import { NextResponse } from 'next/server';
import {
  attachSession,
  CLOUD_PERSONAL_WORKSPACE_ID,
  deleteSessionJson,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
  type CloudProject,
} from '../../_lib/cloud-store';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
    const project = projects.find((candidate) => candidate.id === id);
    return attachSession(
      project
        ? NextResponse.json({ project })
        : NextResponse.json({ error: 'project not found' }, { status: 404 }),
      session,
    );
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not load project' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    const body = await request.json() as Partial<Pick<CloudProject, 'name' | 'pendingPrompt' | 'skillId' | 'designSystemId' | 'metadata' | 'appliedPluginSnapshotId' | 'customInstructions'>>;
    const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
    const index = projects.findIndex((candidate) => candidate.id === id);
    if (index < 0) return NextResponse.json({ error: 'project not found' }, { status: 404 });
    const project = projects[index];
    if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });
    const nextName = typeof body.name === 'string' ? body.name.trim() : project.name;
    if (!nextName) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    projects[index] = {
      ...project,
      ...body,
      name: nextName,
      workspaceId: project.workspaceId ?? CLOUD_PERSONAL_WORKSPACE_ID,
      workspaceVisibility: project.workspaceVisibility ?? 'personal',
      updatedAt: Date.now(),
    };
    await writeSessionJson(session.id, 'projects', projects);
    return attachSession(NextResponse.json({ project: projects[index] }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not update project' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
    const nextProjects = projects.filter((project) => project.id !== id);
    if (nextProjects.length === projects.length) return NextResponse.json({ error: 'project not found' }, { status: 404 });
    await writeSessionJson(session.id, 'projects', nextProjects);
    await deleteSessionJson(session.id, `conversations:${id}`);
    await deleteSessionJson(session.id, `files:${id}`);
    return attachSession(NextResponse.json({ ok: true }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not delete project' }, { status: 500 });
  }
}
