import { NextRequest } from "next/server";
import { runDecomposeAgent } from "@/lib/agents/decompose";
import { makeSseEmitter, SSE_HEADERS } from "@/lib/agents/sse";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    taskId?: string;
    clarificationAnswer?: string;
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sse = makeSseEmitter(controller);
      try {
        if (!body.taskId) {
          sse.error("taskId required");
          return;
        }
        const result = await runDecomposeAgent(
          body.taskId,
          body.clarificationAnswer,
          (e) => sse.toolCall(e)
        );
        sse.done(result);
      } catch (err) {
        console.error("[api/agents/decompose/stream]", err);
        sse.error(err instanceof Error ? err.message : "Agent error");
      } finally {
        sse.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
