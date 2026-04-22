import { runPrioritizationAgent } from "@/lib/agents/prioritize";
import { makeSseEmitter, SSE_HEADERS } from "@/lib/agents/sse";

export async function POST() {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sse = makeSseEmitter(controller);
      try {
        const result = await runPrioritizationAgent({ onToolCall: (e) => sse.toolCall(e) });
        sse.done(result);
      } catch (err) {
        console.error("[api/agents/prioritize/stream]", err);
        sse.error(err instanceof Error ? err.message : "Agent error");
      } finally {
        sse.close();
      }
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
