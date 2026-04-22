import { runUnblockingAgent } from "@/lib/agents/unblock";
import { makeSseEmitter, SSE_HEADERS } from "@/lib/agents/sse";

export async function POST() {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sse = makeSseEmitter(controller);
      try {
        const result = await runUnblockingAgent({ onToolCall: (e) => sse.toolCall(e) });
        sse.done(result);
      } catch (err) {
        console.error("[api/agents/unblock/stream]", err);
        sse.error(err instanceof Error ? err.message : "Agent error");
      } finally {
        sse.close();
      }
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
