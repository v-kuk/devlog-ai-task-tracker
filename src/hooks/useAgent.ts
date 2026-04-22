"use client";

import { useState, useCallback } from "react";
import type { AgentResult } from "@/types";

export type AgentMode = "prioritize" | "decompose" | "unblock";

export interface RunAgentParams {
  taskId?: string;
  clarificationAnswer?: string;
}

export interface UseAgentReturn {
  result: AgentResult | null;
  loading: boolean;
  error: string | null;
  awaitingClarification: boolean;
  question: string | null;
  runAgent: (mode: AgentMode, params?: RunAgentParams) => Promise<void>;
  submitClarification: (mode: AgentMode, answer: string, taskId?: string) => Promise<void>;
  reset: () => void;
}

function endpointFor(mode: AgentMode): string {
  return `/api/agents/${mode}`;
}

export function useAgent(): UseAgentReturn {
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAgent = useCallback(
    async (mode: AgentMode, params?: RunAgentParams) => {
      setLoading(true);
      setError(null);

      const body: Record<string, unknown> = {};
      if (params?.taskId) body.taskId = params.taskId;
      if (params?.clarificationAnswer) body.clarificationAnswer = params.clarificationAnswer;

      try {
        const res = await fetch(endpointFor(mode), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = (await res.json().catch(() => ({}))) as
          | AgentResult
          | { error?: string; result?: AgentResult };

        if (!res.ok) {
          const msg =
            (data as { error?: string }).error ?? `Agent request failed (${res.status})`;
          throw new Error(msg);
        }

        const agentResult =
          "result" in (data as object) && (data as { result?: AgentResult }).result
            ? (data as { result: AgentResult }).result
            : (data as AgentResult);

        setResult(agentResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const submitClarification = useCallback(
    async (mode: AgentMode, answer: string, taskId?: string) => {
      await runAgent(mode, { taskId, clarificationAnswer: answer });
    },
    [runAgent]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  const awaitingClarification = !!result?.needsClarification;
  const question = result?.question ?? null;

  return {
    result,
    loading,
    error,
    awaitingClarification,
    question,
    runAgent,
    submitClarification,
    reset,
  };
}
