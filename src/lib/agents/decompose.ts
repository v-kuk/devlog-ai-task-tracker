// TODO: Implement decompose agent
// - Use @anthropic-ai/sdk with tool_use to break a task into subtasks
// - Return AgentResult with subtasks[] and toolCallLog[]
// - Optionally create subtasks in DB via createTask()
// - Log run to AGENT_LOG.md

import type { AgentResult } from "@/types";

export async function runDecomposeAgent(_taskId: string): Promise<AgentResult> {
  // TODO
  throw new Error("Not implemented");
}
