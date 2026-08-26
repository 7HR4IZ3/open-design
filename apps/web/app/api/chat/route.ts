import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ChatInput = {
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  message?: string;
  model?: string;
};

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 503 });

  const input = await request.json() as ChatInput;
  const messages = input.messages?.length
    ? input.messages
    : input.message
      ? [{ role: 'user' as const, content: input.message }]
      : [];
  if (!messages.length) return Response.json({ error: 'messages or message is required' }, { status: 400 });

  const client = new OpenAI({ apiKey });
  const stream = await client.chat.completions.create({
    model: input.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(sse('start', { provider: 'openai' })));
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(sse('delta', { text: delta })));
        }
        controller.enqueue(encoder.encode(sse('end', { status: 'succeeded' })));
      } catch (error) {
        controller.enqueue(encoder.encode(sse('error', { message: error instanceof Error ? error.message : String(error) })));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
}
