import { NextResponse } from 'next/server';
import { getStaticSkill } from '../../_lib/static-catalog';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skill = await getStaticSkill(id);
  return skill
    ? NextResponse.json(skill)
    : NextResponse.json({ error: 'skill not found' }, { status: 404 });
}
