import { NextResponse } from 'next/server';
import { readSessionJson, requestSession, writeSessionJson, type CloudConversation } from '../../../_lib/cloud-store';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  const conversations = await readSessionJson<CloudConversation[]>(session.id, `conversations:${id}`, []);
  return NextResponse.json({ conversations });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requestSession(request);
  const { id } = await params;
  const body = await request.json() as { title?: string | null };
  const now = Date.now();
  const conversation: CloudConversation = { id: crypto.randomUUID(), projectId: id, title: body.title ?? null, createdAt: now, updatedAt: now };
  const conversations = await readSessionJson<CloudConversation[]>(session.id, `conversations:${id}`, []);
  conversations.push(conversation);
  await writeSessionJson(session.id, `conversations:${id}`, conversations);
  return NextResponse.json({ conversation });
}
