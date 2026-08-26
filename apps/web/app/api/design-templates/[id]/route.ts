import { NextResponse } from 'next/server';
import { getStaticSkill } from '../../_lib/static-catalog';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getStaticSkill(id, true);
  return template
    ? NextResponse.json(template)
    : NextResponse.json({ error: 'design template not found' }, { status: 404 });
}
