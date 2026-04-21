"use client";

import { useState, useCallback } from "react";
import type { AgentResult } from "@/types";

type AgentType = "prioritize" | "decompose" | "unblock";

interface UseAgentResult {
  result: AgentResult | null;
  isLoading: boolean;
  error: string | null;
  runAgent: (type: AgentType, taskId?: string) => Promise<void>;
  clearResult: () => void;
}

export function useAgent(): UseAgentResult {
  const [result, setResult] = useState<AgentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAgent = useCallback(async (type: AgentType, taskId?: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/agents/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(body.error ?? `Agent request failed (${res.status})`);
      }

      const data = (await res.json()) as { result: AgentResult };
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, runAgent, clearResult };
}
