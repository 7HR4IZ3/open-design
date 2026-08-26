import { NextResponse } from 'next/server';
import { getStaticDesignSystem } from '../../_lib/static-catalog';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const designSystem = await getStaticDesignSystem(id);
  return designSystem
    ? NextResponse.json({ designSystem })
    : NextResponse.json({ error: 'design system not found' }, { status: 404 });
}
