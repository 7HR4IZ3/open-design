import { NextResponse } from 'next/server';
import { listStaticDesignSystems } from '../_lib/static-catalog';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ designSystems: await listStaticDesignSystems() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load design systems' }, { status: 500 });
  }
}
