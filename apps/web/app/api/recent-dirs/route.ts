import { NextResponse } from 'next/server';
import {
  attachSession,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
} from '../_lib/cloud-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = requestSession(request);
  try {
    const config = await readSessionJson<{ recentLinkedDirs?: unknown }>(session.id, 'app-config', {});
    const dirs = Array.isArray(config.recentLinkedDirs)
      ? config.recentLinkedDirs.filter((dir): dir is string => typeof dir === 'string').slice(0, 5)
      : [];
    return attachSession(NextResponse.json({ dirs }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Could not load recent directories' }, { status: 500 });
  }
}
