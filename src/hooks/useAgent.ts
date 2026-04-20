// TODO: Implement useAgent hook
// - Calls agent API endpoints: /api/agents/prioritize, decompose, unblock
// - Returns: { result, isLoading, error, runAgent }
// - runAgent(type, taskId?) fires the correct endpoint
// - Manages loading/error state locally
// - AgentResult is stored in local state after successful run

import type { AgentResult } from "@/types";

type AgentType = "prioritize" | "decompose" | "unblock";

interface UseAgentResult {
  result: AgentResult | null;
  isLoading: boolean;
  error: string | null;
  runAgent: (type: AgentType, taskId?: string) => Promise<void>;
}

export function useAgent(): UseAgentResult {
  // TODO
  return {
    result: null,
    isLoading: false,
    error: null,
    runAgent: async () => {},
  };
}
