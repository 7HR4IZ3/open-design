import { NextResponse } from 'next/server';
import {
  CLOUD_PERSONAL_MEMBER_ID,
  CLOUD_PERSONAL_WORKSPACE_ID,
} from '../../_lib/cloud-store';

export const runtime = 'nodejs';

export const PERSONAL_WORKSPACE_ID = CLOUD_PERSONAL_WORKSPACE_ID;
export const PERSONAL_MEMBER_ID = CLOUD_PERSONAL_MEMBER_ID;

export function GET(request: Request) {
  const response = NextResponse.json({
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
  if (!request.headers.get('cookie')?.includes('open-design-session=')) {
    response.cookies.set('open-design-session', crypto.randomUUID(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 31536000,
    });
  }
  return response;
}
