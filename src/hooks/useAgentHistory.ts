"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentResult, ToolCallLog } from "@/types";
import type { AgentMode } from "./useAgent";

const STORAGE_KEY = "agent-run-history";
const MAX_RUNS = 20;

export interface AgentRunRecord {
  id: string;
  mode: AgentMode;
  result: AgentResult;
  toolCallLog: ToolCallLog[];
  taskTitle?: string;
  timestamp: number;
}

function loadFromStorage(): AgentRunRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AgentRunRecord[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(records: AgentRunRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // quota exceeded — drop oldest and retry
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, Math.floor(MAX_RUNS / 2))));
    } catch {}
  }
}

export function useAgentHistory() {
  const [history, setHistory] = useState<AgentRunRecord[]>([]);

  useEffect(() => {
    setHistory(loadFromStorage());
  }, []);

  const saveRun = useCallback(
    (mode: AgentMode, result: AgentResult, taskTitle?: string) => {
      const record: AgentRunRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mode,
        result,
        toolCallLog: result.toolCallLog ?? [],
        taskTitle,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const next = [record, ...prev].slice(0, MAX_RUNS);
        saveToStorage(next);
        return next;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, saveRun, clearHistory };
}
