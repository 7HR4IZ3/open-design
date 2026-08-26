import { NextResponse } from 'next/server';
import { readSessionJson, requestSession, writeSessionJson, type CloudProject } from '../../_lib/cloud-store';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
  const project = projects.find((candidate) => candidate.id === id);
  return project ? NextResponse.json({ project }) : NextResponse.json({ error: 'project not found' }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  const body = await request.json() as Partial<Pick<CloudProject, 'name' | 'pendingPrompt' | 'skillId' | 'designSystemId'>>;
  const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
  const index = projects.findIndex((candidate) => candidate.id === id);
  if (index < 0) return NextResponse.json({ error: 'project not found' }, { status: 404 });
  const project = projects[index];
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });
  projects[index] = { ...project, ...body, updatedAt: Date.now() };
  await writeSessionJson(session.id, 'projects', projects);
  return NextResponse.json({ project: projects[index] });
}
