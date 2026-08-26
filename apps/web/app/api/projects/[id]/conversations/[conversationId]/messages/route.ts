import { NextResponse } from 'next/server';
import { readSessionJson, requestSession, writeSessionJson } from '../../../../../_lib/cloud-store';

export const runtime = 'nodejs';

type CloudMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string; conversationId: string }> }) {
  const session = requestSession(request);
  const { id, conversationId } = await params;
  const messages = await readSessionJson<CloudMessage[]>(session.id, `messages:${id}:${conversationId}`, []);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; conversationId: string }> }) {
  const session = requestSession(request);
  const { id, conversationId } = await params;
  const body = await request.json() as Partial<CloudMessage>;
  if (!body.id || !body.role || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'id, role, and content are required' }, { status: 400 });
  }
  const message: CloudMessage = { id: body.id, role: body.role, content: body.content, createdAt: body.createdAt ?? Date.now() };
  const messages = await readSessionJson<CloudMessage[]>(session.id, `messages:${id}:${conversationId}`, []);
  const index = messages.findIndex((candidate) => candidate.id === message.id);
  if (index >= 0) messages[index] = message;
  else messages.push(message);
  await writeSessionJson(session.id, `messages:${id}:${conversationId}`, messages);
  return NextResponse.json({ message });
}
