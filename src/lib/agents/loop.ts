import Anthropic from "@anthropic-ai/sdk";
import type { ToolCallLog } from "@/types";

export interface AgentLoopParams {
  client: Anthropic;
  model: string;
  maxTokens: number;
  system: string;
  tools: Anthropic.Tool[];
  initialMessages: Anthropic.MessageParam[];
  executeTool: (name: string, input: unknown) => Promise<unknown> | unknown;
  maxIterations?: number;
  onToolCall?: (entry: ToolCallLog) => void;
  shouldStop?: (name: string, input: unknown, output: unknown) => boolean;
}

export interface AgentLoopResult {
  text: string;
  toolCallLog: ToolCallLog[];
  stoppedEarly: boolean;
}

export async function runAgentLoop(p: AgentLoopParams): Promise<AgentLoopResult> {
  const messages: Anthropic.MessageParam[] = [...p.initialMessages];
  const toolCallLog: ToolCallLog[] = [];
  const maxIter = p.maxIterations ?? 12;

  for (let i = 0; i < maxIter; i++) {
    const response = await p.client.messages.create({
      model: p.model,
      max_tokens: p.maxTokens,
      system: p.system,
      tools: p.tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUses.length === 0 || response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { text, toolCallLog, stoppedEarly: false };
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let stop = false;

    for (const block of toolUses) {
      const output = await p.executeTool(block.name, block.input);
      const entry: ToolCallLog = {
        tool: block.name,
        input: (block.input ?? {}) as Record<string, unknown>,
        output: JSON.stringify(output),
      };
      toolCallLog.push(entry);
      p.onToolCall?.(entry);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(output),
      });
      if (p.shouldStop?.(block.name, block.input, output)) stop = true;
    }

    messages.push({ role: "user", content: toolResults });

    if (stop) return { text: "", toolCallLog, stoppedEarly: true };
  }

  return { text: "", toolCallLog, stoppedEarly: false };
}

export function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === "your_key_here") return null;
  return new Anthropic({ apiKey: key });
}

export const AGENT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
