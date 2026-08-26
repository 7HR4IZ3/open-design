import { NextResponse } from 'next/server';
import {
  attachSession,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
  type CloudConversation,
} from '../../../../_lib/cloud-store';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; conversationId: string }> },
) {
  const session = requestSession(request);
  const { id, conversationId } = await params;
  try {
    const body = await request.json() as Partial<Pick<CloudConversation, 'title' | 'sessionMode'>>;
    const conversations = await readSessionJson<CloudConversation[]>(session.id, `conversations:${id}`, []);
    const index = conversations.findIndex((conversation) => conversation.id === conversationId);
    if (index < 0) return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
    const conversation = conversations[index];
    if (!conversation) return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
    conversations[index] = {
      ...conversation,
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.sessionMode !== undefined ? { sessionMode: body.sessionMode } : {}),
      updatedAt: Date.now(),
    };
    await writeSessionJson(session.id, `conversations:${id}`, conversations);
    return attachSession(NextResponse.json({ conversation: conversations[index] }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not update conversation' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; conversationId: string }> },
) {
  const session = requestSession(request);
  const { id, conversationId } = await params;
  try {
    const conversations = await readSessionJson<CloudConversation[]>(session.id, `conversations:${id}`, []);
    const next = conversations.filter((conversation) => conversation.id !== conversationId);
    if (next.length === conversations.length) return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
    await writeSessionJson(session.id, `conversations:${id}`, next);
    await writeSessionJson(session.id, `messages:${id}:${conversationId}`, []);
    return attachSession(NextResponse.json({ ok: true }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not delete conversation' }, { status: 500 });
  }
}
