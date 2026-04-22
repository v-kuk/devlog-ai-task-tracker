import type { AgentResult, ToolCallLog } from "@/types";

export interface SseHandlers {
  onToolCall?: (entry: ToolCallLog) => void;
  onDone?: (result: AgentResult) => void;
  onError?: (message: string) => void;
}

/**
 * Minimal SSE parser for fetch-based streams. Handles `event: ...\ndata: ...\n\n`
 * frames. Ignores heartbeat comments.
 */
export async function consumeSse(
  response: Response,
  handlers: SseHandlers,
  signal?: AbortSignal
): Promise<void> {
  if (!response.body) throw new Error("response has no body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const abort = () => reader.cancel().catch(() => {});
  signal?.addEventListener("abort", abort, { once: true });

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        dispatch(frame, handlers);
      }
    }
    if (buffer.trim().length > 0) dispatch(buffer, handlers);
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

function dispatch(frame: string, handlers: SseHandlers) {
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of frame.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }
  if (event === "tool_call") handlers.onToolCall?.(parsed as ToolCallLog);
  else if (event === "done") handlers.onDone?.(parsed as AgentResult);
  else if (event === "error") {
    const msg = (parsed as { message?: string })?.message ?? "Agent error";
    handlers.onError?.(msg);
  }
}
