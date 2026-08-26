import { NextResponse } from 'next/server';
import {
  attachSession,
  CloudStoreUnavailable,
  cloudPersonalWorkspaceContext,
  readSessionJson,
  requestSession,
  type CloudProject,
} from '../../../_lib/cloud-store';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
    const project = projects.find((candidate) => candidate.id === id);
    if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });
    const context = cloudPersonalWorkspaceContext();
    return attachSession(NextResponse.json({
      scope: {
        kind: 'personal',
        projectId: id,
        workspaceId: context.workspaceId,
        visibility: project.workspaceVisibility ?? 'personal',
        context,
      },
    }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not load project workspace scope' }, { status: 500 });
  }
}
