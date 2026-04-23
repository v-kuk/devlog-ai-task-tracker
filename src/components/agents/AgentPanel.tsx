"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  GitBranch,
  Zap,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAgent, type AgentMode } from "@/hooks/useAgent";
import type { Task } from "@/types";
import { labelFor } from "./toolLabels";
import { PrioritizeSection } from "./PrioritizeSection";
import { DecomposeSection } from "./DecomposeSection";
import { UnblockSection } from "./UnblockSection";
import { ToolCallTimeline } from "./ToolCallTimeline";

export interface AgentPanelProps {
  open: boolean;
  mode: AgentMode;
  task?: Task;
  onClose: () => void;
  onJumpToTask?: (taskId: string) => void;
  /** Called when an agent run creates or mutates tasks (e.g. decompose). */
  onTasksChanged?: () => void;
}

const MODE_META: Record<
  AgentMode,
  { title: string; desc: string; cta: string; icon: typeof Sparkles }
> = {
  prioritize: {
    title: "Prioritize my day",
    desc: "Agent reviews your task list and recommends what to work on.",
    cta: "Analyze my tasks",
    icon: ArrowUpDown,
  },
  decompose: {
    title: "Decompose task",
    desc: "Agent breaks a task into small, actionable subtasks.",
    cta: "Break into subtasks",
    icon: GitBranch,
  },
  unblock: {
    title: "Scan for blockers",
    desc: "Agent finds stuck work and suggests concrete next steps.",
    cta: "Scan for blockers",
    icon: Zap,
  },
};

export function AgentPanel({ open, mode, task, onClose, onJumpToTask, onTasksChanged }: AgentPanelProps) {
  const {
    result,
    loading,
    error,
    awaitingClarification,
    runAgent,
    submitClarification,
    reset,
    streamingToolCalls,
  } = useAgent();

  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [showReasoning, setShowReasoning] = useState(false);
  const notifiedRef = useRef<typeof result | null>(null);

  useEffect(() => {
    if (
      result?.type === "decompose" &&
      !result.needsClarification &&
      result.subtasks.length > 0 &&
      notifiedRef.current !== result
    ) {
      notifiedRef.current = result;
      onTasksChanged?.();
    }
  }, [result, onTasksChanged]);

  useEffect(() => {
    if (!open) {
      reset();
      setClarificationAnswer("");
      setShowReasoning(false);
      notifiedRef.current = null;
    }
  }, [open, reset]);

  const meta = MODE_META[mode];
  const canDecompose = mode !== "decompose" || !!task;

  const handleRun = () => void runAgent(mode, { taskId: task?.id });

  const handleSubmitClarification = () => {
    if (!clarificationAnswer.trim()) return;
    void submitClarification(mode, clarificationAnswer.trim(), task?.id);
    setClarificationAnswer("");
  };

  const handleJump = (taskId: string) => {
    onJumpToTask?.(taskId);
    onClose();
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-task-id="${taskId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("ring-2", "ring-amber-400");
      setTimeout(() => el?.classList.remove("ring-2", "ring-amber-400"), 1800);
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent
        side="right"
        className="sm:max-w-lg w-full overflow-y-auto overflow-x-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[var(--foreground)]">
            <meta.icon size={16} className="text-amber-400" />
            {meta.title}
          </SheetTitle>
          <SheetDescription className="text-[var(--muted)]">
            {meta.desc}
            {task && (
              <span className="mono block mt-1 text-[10px]">Task: {task.title}</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {!result && !awaitingClarification && (
            <Button onClick={handleRun} disabled={loading || !canDecompose} className="w-full">
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Agent is thinking<AnimatedDots />
                </>
              ) : (
                <>
                  <Sparkles size={14} className="mr-2" />
                  {meta.cta}
                </>
              )}
            </Button>
          )}

          {!canDecompose && (
            <p className="text-xs text-amber-400">
              Decompose requires a task. Open this panel from a task card.
            </p>
          )}

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] mono">
                <Loader2 size={14} className="animate-spin" />
                Agent is thinking<AnimatedDots />
              </div>
              {streamingToolCalls.length > 0 && (
                <ul
                  className="rounded-sm border divide-y overflow-hidden"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                >
                  {streamingToolCalls.map((e, i) => {
                    const { label, summary } = labelFor(e.tool, e.input);
                    return (
                      <li key={i} className="p-2 text-xs mono flex items-start gap-2 min-w-0">
                        <Loader2 size={12} className="animate-spin shrink-0 mt-0.5 text-amber-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[var(--foreground)]">{label}</div>
                          {summary && (
                            <div className="text-[10px] text-[var(--muted)] truncate">{summary}</div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {result?.mocked && (
            <div
              className="flex items-start gap-2 p-3 rounded-sm border text-xs"
              style={{
                background: "rgba(251, 191, 36, 0.08)",
                borderColor: "rgba(251, 191, 36, 0.3)",
                color: "rgb(253, 224, 71)",
              }}
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Mock response</div>
                <div className="text-[var(--muted)] mt-0.5">
                  {result.notice ?? "Set ANTHROPIC_API_KEY to enable real AI."}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-sm border text-xs"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                borderColor: "rgba(239, 68, 68, 0.3)",
                color: "rgb(252, 165, 165)",
              }}
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">Agent failed</div>
                <div className="mt-0.5">{error}</div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRun}>
                <RefreshCw size={12} className="mr-1" />
                Retry
              </Button>
            </div>
          )}

          {result && !error && (
            <>
              {result.type === "prioritize" && (
                <PrioritizeSection result={result} onJumpToTask={handleJump} />
              )}
              {result.type === "decompose" && (
                <DecomposeSection
                  clarificationAnswer={clarificationAnswer}
                  setClarificationAnswer={setClarificationAnswer}
                  onSubmitClarification={handleSubmitClarification}
                  result={result}
                  loading={loading}
                />
              )}
              {result.type === "unblock" && <UnblockSection result={result} />}

              {result.toolCallLog && result.toolCallLog.length > 0 && (
                <div
                  className="rounded-sm border"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                >
                  <button
                    onClick={() => setShowReasoning((s) => !s)}
                    className="w-full flex items-center justify-between p-3 text-xs mono text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {showReasoning ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      Agent reasoning ({result.toolCallLog.length} tool calls)
                    </span>
                  </button>
                  {showReasoning && <ToolCallTimeline log={result.toolCallLog} />}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AnimatedDots() {
  return <span className="ml-1 inline-block animate-pulse">…</span>;
}
