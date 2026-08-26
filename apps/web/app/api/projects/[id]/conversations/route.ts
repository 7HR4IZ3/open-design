import { NextResponse } from 'next/server';
import {
  attachSession,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
  type CloudConversation,
  type CloudProject,
} from '../../../_lib/cloud-store';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
    if (!projects.some((project) => project.id === id)) return NextResponse.json({ error: 'project not found' }, { status: 404 });
    const conversations = await readSessionJson<CloudConversation[]>(session.id, `conversations:${id}`, []);
    return attachSession(NextResponse.json({ conversations }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not load conversations' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  try {
    const projects = await readSessionJson<CloudProject[]>(session.id, 'projects', []);
    if (!projects.some((project) => project.id === id)) return NextResponse.json({ error: 'project not found' }, { status: 404 });
    const body = await request.json() as { title?: string | null; sessionMode?: string };
    const now = Date.now();
    const conversation: CloudConversation = {
      id: crypto.randomUUID(),
      projectId: id,
      title: body.title ?? null,
      ...(body.sessionMode ? { sessionMode: body.sessionMode } : {}),
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };
    const conversations = await readSessionJson<CloudConversation[]>(session.id, `conversations:${id}`, []);
    conversations.push(conversation);
    await writeSessionJson(session.id, `conversations:${id}`, conversations);
    return attachSession(NextResponse.json({ conversation }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not create conversation' }, { status: 500 });
  }
}
