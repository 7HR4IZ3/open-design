import { NextResponse } from 'next/server';
import { listStaticSkills } from '../_lib/static-catalog';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const skills = await listStaticSkills();
    return NextResponse.json({
      skills: skills.map(({ body: _body, ...summary }) => summary),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load skills' }, { status: 500 });
  }
}
