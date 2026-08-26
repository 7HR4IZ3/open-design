export const runtime = 'nodejs';

export function GET() {
  return Response.json({
    ok: true,
    service: 'open-design-web',
    runtime: 'vercel',
  });
}
