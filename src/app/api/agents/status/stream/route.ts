import { z } from "zod";
import { runStatusAgent } from "@/lib/agents/status";
import { makeSseEmitter, SSE_HEADERS } from "@/lib/agents/sse";

const BodySchema = z.object({ taskId: z.string() });

export async function POST(req: Request) {
  let taskId: string;
  try {
    const body = BodySchema.parse(await req.json());
    taskId = body.taskId;
  } catch {
    return new Response(JSON.stringify({ error: "taskId required" }), { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sse = makeSseEmitter(controller);
      try {
        const result = await runStatusAgent({ taskId, onToolCall: (e) => sse.toolCall(e) });
        sse.done(result);
      } catch (err) {
        console.error("[api/agents/status/stream]", err);
        sse.error(err instanceof Error ? err.message : "Agent error");
      } finally {
        sse.close();
      }
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
