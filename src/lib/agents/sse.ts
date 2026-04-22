import type { AgentResult, ToolCallLog } from "@/types";

export interface SseEmitter {
  toolCall(entry: ToolCallLog): void;
  done(result: AgentResult): void;
  error(message: string): void;
  close(): void;
}

/**
 * Wraps a ReadableStreamDefaultController in SSE-frame-writing helpers.
 * Each call produces a single `event:`/`data:` pair terminated by `\n\n`.
 */
export function makeSseEmitter(
  controller: ReadableStreamDefaultController<Uint8Array>
): SseEmitter {
  const encoder = new TextEncoder();
  let closed = false;

  function write(event: string, data: unknown) {
    if (closed) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    try {
      controller.enqueue(encoder.encode(payload));
    } catch {
      // stream already closed / client disconnected
      closed = true;
    }
  }

  return {
    toolCall(entry) {
      write("tool_call", entry);
    },
    done(result) {
      write("done", result);
    },
    error(message) {
      write("error", { message });
    },
    close() {
      if (closed) return;
      closed = true;
      try {
        controller.close();
      } catch {
        // noop
      }
    },
  };
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;
