import { NextResponse } from 'next/server';
import {
  attachSession,
  CloudStoreUnavailable,
  readSessionJson,
  requestSession,
  writeSessionJson,
  type CloudConversation,
  type CloudMessage,
} from '../../../../../../_lib/cloud-store';

export const runtime = 'nodejs';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; conversationId: string; messageId: string }> }) {
  const session = requestSession(request);
  const { id, conversationId, messageId } = await params;
  try {
    const body = await request.json() as Partial<CloudMessage>;
    if (
      !['user', 'assistant', 'system'].includes(body.role ?? '')
      || typeof body.content !== 'string'
    ) {
      return NextResponse.json({ error: 'role and content are required' }, { status: 400 });
    }
    const messages = await readSessionJson<CloudMessage[]>(session.id, `messages:${id}:${conversationId}`, []);
    const message: CloudMessage = {
      ...body,
      id: messageId,
      role: body.role as CloudMessage['role'],
      content: body.content,
      createdAt: typeof body.createdAt === 'number' ? body.createdAt : Date.now(),
    };
    const index = messages.findIndex((candidate) => candidate.id === messageId);
    if (index >= 0) messages[index] = message;
    else messages.push(message);
    await writeSessionJson(session.id, `messages:${id}:${conversationId}`, messages);
    await touchConversation(session.id, id, conversationId, messages);
    return attachSession(NextResponse.json({ message }), session);
  } catch (error) {
    if (error instanceof CloudStoreUnavailable) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: 'Could not update message' }, { status: 500 });
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
