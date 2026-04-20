// TODO: Implement unblock agent
// - Use @anthropic-ai/sdk with tool_use to suggest how to unblock a stuck task
// - Return AgentResult with content (advice), optional subtasks[], toolCallLog[]
// - May set needsClarification=true + question if more info needed
// - Log run to AGENT_LOG.md

import type { AgentResult } from "@/types";

export async function runUnblockAgent(_taskId: string): Promise<AgentResult> {
  // TODO
  throw new Error("Not implemented");
}
