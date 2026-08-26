import { NextResponse } from 'next/server';
import {
  attachSession,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
  type CloudConversation,
  type CloudMessage,
} from '../../../../../_lib/cloud-store';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; conversationId: string }> }) {
  const session = requestSession(request);
  const { id, conversationId } = await params;
  try {
    const messages = await readSessionJson<CloudMessage[]>(session.id, `messages:${id}:${conversationId}`, []);
    return attachSession(NextResponse.json({ messages }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not load messages' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; conversationId: string }> }) {
  const session = requestSession(request);
  const { id, conversationId } = await params;
  try {
    const body = await request.json() as Partial<CloudMessage>;
    if (
      typeof body.id !== 'string'
      || !['user', 'assistant', 'system'].includes(body.role ?? '')
      || typeof body.content !== 'string'
    ) {
      return NextResponse.json({ error: 'id, role, and content are required' }, { status: 400 });
    }
    const message: CloudMessage = {
      ...body,
      id: body.id,
      role: body.role as CloudMessage['role'],
      content: body.content,
      createdAt: typeof body.createdAt === 'number' ? body.createdAt : Date.now(),
    };
    const messages = await readSessionJson<CloudMessage[]>(session.id, `messages:${id}:${conversationId}`, []);
    const index = messages.findIndex((candidate) => candidate.id === message.id);
    if (index >= 0) messages[index] = message;
    else messages.push(message);
    await writeSessionJson(session.id, `messages:${id}:${conversationId}`, messages);
    await touchConversation(session.id, id, conversationId, messages);
    return attachSession(NextResponse.json({ message }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not save message' }, { status: 500 });
  }
}

async function touchConversation(
  sessionId: string,
  projectId: string,
  conversationId: string,
  messages: CloudMessage[],
): Promise<void> {
  const conversations = await readSessionJson<CloudConversation[]>(sessionId, `conversations:${projectId}`, []);
  const index = conversations.findIndex((conversation) => conversation.id === conversationId);
  if (index < 0) return;
  const conversation = conversations[index];
  if (!conversation) return;
  const latestMessage = messages[messages.length - 1];
  conversations[index] = {
    ...conversation,
    messageCount: messages.length,
    updatedAt: Date.now(),
    ...(latestMessage?.runStatus && typeof latestMessage.runStatus === 'string'
      ? { latestRun: { ...conversation.latestRun, status: latestMessage.runStatus } }
      : {}),
  };
  await writeSessionJson(sessionId, `conversations:${projectId}`, conversations);
}
