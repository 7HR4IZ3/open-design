import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export const PERSONAL_WORKSPACE_ID = 'personal-vercel';
export const PERSONAL_MEMBER_ID = 'member-vercel';

export function GET() {
  return NextResponse.json({
    items: [
      {
        workspaceId: PERSONAL_WORKSPACE_ID,
        workspaceName: 'Personal workspace',
        workspaceType: 'personal',
        workspaceMemberId: PERSONAL_MEMBER_ID,
        role: 'owner',
        memberStatus: 'active',
        lifecycleState: 'active',
      },
    ],
    activeWorkspaceId: PERSONAL_WORKSPACE_ID,
  });
}
