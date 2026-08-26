import { NextResponse } from 'next/server';
import {
  PERSONAL_MEMBER_ID,
  PERSONAL_WORKSPACE_ID,
} from '../directory/route';

export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    context: {
      workspaceId: PERSONAL_WORKSPACE_ID,
      workspaceType: 'personal',
      workspaceMemberId: PERSONAL_MEMBER_ID,
      role: 'owner',
      memberStatus: 'active',
      lifecycleState: 'active',
      billingState: 'free',
      planId: null,
      providerMode: 'personal_byok',
      seatSummary: { seatLimit: 1, usedSeats: 1, availableSeats: 0, isSeatFull: false },
      permissions: {
        canManageMembers: false,
        canManageBilling: false,
        canInviteMembers: false,
        canManageAutoRecharge: false,
        canShareProjects: false,
        canWriteSyncedFiles: false,
        canViewWorkspaceSettings: false,
        canManageSharedResources: false,
      },
      workspaceName: 'Personal workspace',
      displayName: 'Vercel user',
      avatarUrl: null,
    },
  });
}
