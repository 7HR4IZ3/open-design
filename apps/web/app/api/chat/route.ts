import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ChatInput = {
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  message?: string;
  model?: string;
  systemPrompt?: string;
};

const DEFAULT_SYSTEM_PROMPT = [
  'You are the hosted OpenDesign design agent.',
  'Help the user plan and build polished, responsive web experiences.',
  'When the user asks you to create or modify a UI, return one complete, self-contained HTML document inside this exact wrapper:',
  '<artifact identifier="index.html" type="text/html" title="A concise title"> ...complete HTML... </artifact>',
  'Use inline CSS and JavaScript unless the user explicitly asks for separate files.',
  'Do not put the artifact in a Markdown code fence. For ordinary questions, answer in concise plain text.',
].join('\n');

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 503 });

  const input = await request.json() as ChatInput;
  const history = input.messages?.length
    ? input.messages.filter((message) => message.role !== 'system')
    : input.message
      ? [{ role: 'user' as const, content: input.message }]
      : [];
  if (!history.length) return Response.json({ error: 'messages or message is required' }, { status: 400 });
  const messages = [
    { role: 'system' as const, content: input.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT },
    ...history,
  ];

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
