// TODO: Implement prioritize agent
// - Use @anthropic-ai/sdk with tool_use to analyze all tasks
// - Return AgentResult with recommendations[] and toolCallLog[]
// - Log run to AGENT_LOG.md
// - Synchronous DB reads only (better-sqlite3)

import type { AgentResult } from "@/types";

export async function runPrioritizeAgent(_taskIds?: string[]): Promise<AgentResult> {
  // TODO
  throw new Error("Not implemented");
}
