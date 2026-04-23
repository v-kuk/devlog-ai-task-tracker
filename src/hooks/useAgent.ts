"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentResult, ToolCallLog } from "@/types";
import { consumeSse } from "@/lib/agents/sse-client";

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
  /** Tool calls received live while the agent is running. */
  streamingToolCalls: ToolCallLog[];
  runAgent: (mode: AgentMode, params?: RunAgentParams) => Promise<void>;
  submitClarification: (mode: AgentMode, answer: string, taskId?: string) => Promise<void>;
  reset: () => void;
  /** Restore a previously saved run into the current state. */
  loadResult: (result: AgentResult, toolCalls: ToolCallLog[]) => void;
}

function streamEndpoint(mode: AgentMode): string {
  return `/api/agents/${mode}/stream`;
}

export function useAgent(): UseAgentReturn {
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCallLog[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const runAgent = useCallback(
    async (mode: AgentMode, params?: RunAgentParams) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setStreamingToolCalls([]);

      const body: Record<string, unknown> = {};
      if (params?.taskId) body.taskId = params.taskId;
      if (params?.clarificationAnswer) body.clarificationAnswer = params.clarificationAnswer;

      try {
        const res = await fetch(streamEndpoint(mode), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Agent request failed (${res.status})`);
        }

        let gotError: string | null = null;
        let gotResult: AgentResult | null = null;

        await consumeSse(
          res,
          {
            onToolCall: (entry) => {
              setStreamingToolCalls((prev) => [...prev, entry]);
            },
            onDone: (r) => {
              gotResult = r;
            },
            onError: (msg) => {
              gotError = msg;
            },
          },
          controller.signal
        );

        if (gotError) throw new Error(gotError);
        if (gotResult) setResult(gotResult);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
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
    abortRef.current?.abort();
    setResult(null);
    setError(null);
    setLoading(false);
    setStreamingToolCalls([]);
  }, []);

  const loadResult = useCallback((r: AgentResult, toolCalls: ToolCallLog[]) => {
    abortRef.current?.abort();
    setLoading(false);
    setError(null);
    setStreamingToolCalls(toolCalls);
    setResult(r);
  }, []);

  const awaitingClarification =
    result?.type === "decompose" && result.needsClarification === true;
  const question =
    result?.type === "decompose" && result.needsClarification === true
      ? result.question
      : null;

  return {
    result,
    loading,
    error,
    awaitingClarification,
    question,
    streamingToolCalls,
    runAgent,
    submitClarification,
    reset,
    loadResult,
  };
}
