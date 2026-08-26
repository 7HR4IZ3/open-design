import { NextResponse } from 'next/server';
import {
  attachSession,
  CLOUD_PERSONAL_WORKSPACE_ID,
  cloudPersonalWorkspaceContext,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  type CloudProject,
} from '../../../_lib/cloud-store';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = requestSession(request);
  const { workspaceId } = await params;
  if (workspaceId !== CLOUD_PERSONAL_WORKSPACE_ID) {
    return NextResponse.json({ projects: [] });
  }
  try {
    const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
    const context = cloudPersonalWorkspaceContext();
    const summaries = projects.map((project) => ({
      id: project.id,
      name: project.name,
      workspaceId: context.workspaceId,
      visibility: project.workspaceVisibility ?? 'personal',
      resourceState: 'active' as const,
      createdByWorkspaceMemberId: context.workspaceMemberId,
      updatedByWorkspaceMemberId: context.workspaceMemberId,
      resourceHubResourceId: null,
      cloudTombstonedAt: null,
      currentUserAccess: {
        canOpen: true,
        canRename: true,
        canDelete: true,
        canDuplicate: true,
        canMoveToTeam: false,
        canMoveToPersonal: false,
        canExport: true,
        canSendTo: true,
        canRestoreVersion: true,
      },
      syncState: 'local_only' as const,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      metadata: project.metadata,
      project: {
        ...project,
        workspaceId: context.workspaceId,
        workspaceVisibility: project.workspaceVisibility ?? 'personal',
      },
    }));
    return attachSession(NextResponse.json({ projects: summaries }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not load workspace projects' }, { status: 500 });
  }
}
