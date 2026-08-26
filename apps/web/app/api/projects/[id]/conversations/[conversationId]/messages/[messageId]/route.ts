import { NextResponse } from 'next/server';
import { readSessionJson, requestSession, writeSessionJson } from '../../../../../../_lib/cloud-store';

export const runtime = 'nodejs';

type CloudMessage = { id: string; role: 'user' | 'assistant' | 'system'; content: string; createdAt: number };

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; conversationId: string; messageId: string }> }) {
  const session = requestSession(request);
  const { id, conversationId, messageId } = await params;
  const body = await request.json() as Partial<CloudMessage>;
  if (!body.role || typeof body.content !== 'string') return NextResponse.json({ error: 'role and content are required' }, { status: 400 });
  const messages = await readSessionJson<CloudMessage[]>(session.id, `messages:${id}:${conversationId}`, []);
  const message: CloudMessage = { id: messageId, role: body.role, content: body.content, createdAt: body.createdAt ?? Date.now() };
  const index = messages.findIndex((candidate) => candidate.id === messageId);
  if (index >= 0) messages[index] = message;
  else messages.push(message);
  await writeSessionJson(session.id, `messages:${id}:${conversationId}`, messages);
  return NextResponse.json({ message });
}
