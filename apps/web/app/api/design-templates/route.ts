import { NextResponse } from 'next/server';
import { listStaticDesignTemplates } from '../_lib/static-catalog';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const templates = await listStaticDesignTemplates();
    return NextResponse.json({
      designTemplates: templates.map(({ body: _body, ...summary }) => summary),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load design templates' }, { status: 500 });
  }
}
