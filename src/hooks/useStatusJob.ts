"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentResult, ToolCallLog } from "@/types";
import { consumeSse } from "@/lib/agents/sse-client";

interface StatusJob {
  loading: boolean;
  result: AgentResult | null;
  streamingToolCalls: ToolCallLog[];
  error: string | null;
}

const EMPTY: StatusJob = { loading: false, result: null, streamingToolCalls: [], error: null };

const store = new Map<string, StatusJob>();
const listeners = new Map<string, Set<() => void>>();

function getJob(taskId: string): StatusJob {
  return store.get(taskId) ?? EMPTY;
}

function setJob(taskId: string, update: Partial<StatusJob>) {
  store.set(taskId, { ...getJob(taskId), ...update });
  listeners.get(taskId)?.forEach((cb) => cb());
}

function subscribe(taskId: string, cb: () => void) {
  if (!listeners.has(taskId)) listeners.set(taskId, new Set());
  listeners.get(taskId)!.add(cb);
}

function unsubscribe(taskId: string, cb: () => void) {
  listeners.get(taskId)?.delete(cb);
}

const onDoneCallbacks = new Map<string, (result: AgentResult) => void>();

async function startStatusJob(taskId: string, onDone?: (result: AgentResult) => void): Promise<void> {
  if (getJob(taskId).loading) return;
  if (onDone) onDoneCallbacks.set(taskId, onDone);

  setJob(taskId, { loading: true, error: null, streamingToolCalls: [] });

  try {
    const res = await fetch("/api/agents/status/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });

    if (!res.ok) throw new Error(`Agent request failed (${res.status})`);

    let gotResult: AgentResult | null = null;
    let gotError: string | null = null;

    await consumeSse(res, {
      onToolCall: (entry) => {
        setJob(taskId, { streamingToolCalls: [...getJob(taskId).streamingToolCalls, entry] });
      },
      onDone: (r) => {
        gotResult = r;
      },
      onError: (msg) => {
        gotError = msg;
      },
    });

    if (gotError) throw new Error(gotError);
    if (gotResult) {
      setJob(taskId, { result: gotResult, loading: false });
      onDoneCallbacks.get(taskId)?.(gotResult);
    } else {
      setJob(taskId, { loading: false });
    }
    onDoneCallbacks.delete(taskId);
  } catch (err) {
    onDoneCallbacks.delete(taskId);
    setJob(taskId, {
      loading: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export function useStatusJob(taskId: string | undefined, onDone?: (result: AgentResult) => void) {
  const [state, setState] = useState<StatusJob>(() =>
    taskId ? getJob(taskId) : EMPTY
  );

  useEffect(() => {
    if (!taskId) return;
    const cb = () => setState({ ...getJob(taskId) });
    subscribe(taskId, cb);
    setState({ ...getJob(taskId) });
    return () => unsubscribe(taskId, cb);
  }, [taskId]);

  const generate = useCallback(() => {
    if (taskId) void startStatusJob(taskId, onDone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const reset = useCallback(() => {
    if (taskId) {
      store.delete(taskId);
      setState(EMPTY);
      listeners.get(taskId)?.forEach((cb) => cb());
    }
  }, [taskId]);

  return { ...state, generate, reset };
}
