import { NextResponse } from 'next/server';
import {
  cloudPersonalWorkspaceContext,
} from '../../_lib/cloud-store';

export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    context: {
      ...cloudPersonalWorkspaceContext(),
      displayName: 'Vercel user',
      avatarUrl: null,
    },
  });
}
