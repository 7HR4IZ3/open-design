import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const agents = [
  {
    id: 'byok-opencode',
    name: 'OpenDesign Cloud',
    bin: 'provider-api',
    available: true,
    authStatus: 'configured',
    modelsSource: 'fallback',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
    ],
    docsUrl: 'https://platform.openai.com/docs',
  },
  {
    id: 'openai-api',
    name: 'OpenAI API',
    bin: 'provider-api',
    available: true,
    authStatus: 'unknown',
    modelsSource: 'fallback',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
    ],
    docsUrl: 'https://platform.openai.com/docs',
  },
  {
    id: 'anthropic-api',
    name: 'Anthropic API',
    bin: 'provider-api',
    available: true,
    authStatus: 'unknown',
    modelsSource: 'fallback',
    models: [
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku' },
    ],
    docsUrl: 'https://docs.anthropic.com',
  },
];

export function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('stream') !== '1') return NextResponse.json({ agents });
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const agent of agents) {
        controller.enqueue(encoder.encode(`event: agent\ndata: ${JSON.stringify(agent)}\n\n`));
      }
      controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
      controller.close();
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' } });
}
