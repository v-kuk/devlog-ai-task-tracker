"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  GitBranch,
  Zap,
  ArrowUpDown,
  MessageCircleQuestion,
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAgent, type AgentMode } from "@/hooks/useAgent";
import type { Task, ToolCallLog } from "@/types";

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
    question,
    runAgent,
    submitClarification,
    reset,
    streamingToolCalls,
  } = useAgent();

  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [showReasoning, setShowReasoning] = useState(false);
  const notifiedRef = useRef<typeof result | null>(null);

  // Notify parent when decompose writes subtasks so task list can re-fetch.
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

  // Reset internal state when sheet closes
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

  const handleRun = () => {
    void runAgent(mode, { taskId: task?.id });
  };

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
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="sm:max-w-lg w-full overflow-y-auto"
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
              <span className="mono block mt-1 text-[10px]">
                Task: {task.title}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* CTA */}
          {!result && !awaitingClarification && (
            <Button
              onClick={handleRun}
              disabled={loading || !canDecompose}
              className="w-full"
            >
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
                  className="rounded-sm border divide-y"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                >
                  {streamingToolCalls.map((e, i) => (
                    <li key={i} className="p-2 text-xs mono">
                      <span className="text-amber-400">→ {e.tool}</span>
                      <span className="text-[10px] text-[var(--muted)] ml-2 truncate">
                        {JSON.stringify(e.input).slice(0, 80)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Mocked notice */}
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

          {/* Error */}
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

          {/* Mode-specific sections */}
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

              {/* Agent reasoning collapsible */}
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
                      {showReasoning ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
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

// ─── Prioritize ───────────────────────────────────────────────────────────────

function PrioritizeSection({
  result,
  onJumpToTask,
}: {
  result: import("@/types").PrioritizeResult;
  onJumpToTask: (id: string) => void;
}) {
  const recs = result.recommendations ?? [];

  if (recs.length === 0) {
    return (
      <p className="text-xs text-[var(--muted)] mono">
        No recommendations returned.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {result.summary && (
        <p className="text-xs text-[var(--muted)] leading-relaxed">{result.summary}</p>
      )}
      <ol className="space-y-2">
        {recs.map((r, i) => (
          <li
            key={`${r.taskId}-${i}`}
            className="rounded-sm border p-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="flex items-start gap-2">
              <span className="mono text-[10px] font-semibold text-amber-400 mt-0.5">
                {i + 1}.
              </span>
              <div className="flex-1">
                <div className="font-semibold text-sm text-[var(--foreground)]">
                  {r.title ?? "Untitled task"}
                </div>
                <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                  {r.reason}
                </p>
              </div>
              {r.taskId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onJumpToTask(r.taskId)}
                  className="shrink-0"
                >
                  Jump
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Decompose ────────────────────────────────────────────────────────────────

interface DecomposeSectionProps {
  clarificationAnswer: string;
  setClarificationAnswer: (v: string) => void;
  onSubmitClarification: () => void;
  result: import("@/types").DecomposeResult;
  loading: boolean;
}

function DecomposeSection({
  clarificationAnswer,
  setClarificationAnswer,
  onSubmitClarification,
  result,
  loading,
}: DecomposeSectionProps) {
  if (result.needsClarification) {
    const question = result.question;
    return (
      <div
        className="rounded-sm border p-4 space-y-3"
        style={{
          background: "rgba(251, 191, 36, 0.08)",
          borderColor: "rgba(251, 191, 36, 0.3)",
        }}
      >
        <div className="flex items-start gap-2">
          <MessageCircleQuestion size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="mono text-[10px] font-semibold tracking-widest uppercase text-amber-400">
              Clarification needed
            </div>
            <p className="text-sm text-[var(--foreground)] mt-1">{question}</p>
          </div>
        </div>
        <Textarea
          value={clarificationAnswer}
          onChange={(e) => setClarificationAnswer(e.target.value)}
          placeholder="Type your answer…"
          disabled={loading}
        />
        <Button
          onClick={onSubmitClarification}
          disabled={loading || !clarificationAnswer.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin mr-2" /> Submitting…
            </>
          ) : (
            "Submit answer"
          )}
        </Button>
      </div>
    );
  }

  const subtasks = result.subtasks ?? [];

  return (
    <div className="space-y-3">
      {result.summary && (
        <p className="text-xs text-[var(--muted)] leading-relaxed">{result.summary}</p>
      )}
      {subtasks.length === 0 ? (
        <p className="text-xs text-[var(--muted)] mono">No subtasks created.</p>
      ) : (
        <ul className="space-y-2">
          {subtasks.map((s, i) => (
            <li
              key={s.id ?? i}
              className="flex items-start gap-2 rounded-sm border p-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <input
                type="checkbox"
                disabled
                className="mt-0.5 accent-amber-400"
                aria-label="subtask complete"
              />
              <div className="flex-1">
                <div className="text-sm text-[var(--foreground)] font-medium">
                  {s.title}
                </div>
              </div>
              <Badge variant="outline" className={priorityBadgeClass(s.priority)}>
                {s.priority}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function priorityBadgeClass(p: "low" | "medium" | "high"): string {
  if (p === "high") return "border-red-700 text-red-400";
  if (p === "medium") return "border-amber-700 text-amber-400";
  return "border-emerald-700 text-emerald-400";
}

// ─── Unblock ──────────────────────────────────────────────────────────────────

function UnblockSection({ result }: { result: import("@/types").UnblockResult }) {
  const blocked = result.blockedTasks ?? [];
  if (blocked.length === 0) {
    return (
      <p className="text-xs text-[var(--muted)] mono">
        No blocked tasks found. Nice.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {blocked.map((b) => {
        const severity =
          b.daysStuck >= 7 ? "red" : b.daysStuck >= 3 ? "yellow" : "zinc";
        const badgeClass =
          severity === "red"
            ? "border-red-700 text-red-400"
            : severity === "yellow"
            ? "border-amber-700 text-amber-400"
            : "border-zinc-600 text-zinc-400";
        return (
          <li
            key={b.task.id}
            className="rounded-sm border p-3 space-y-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-sm text-[var(--foreground)]">
                {b.task.title}
              </div>
              <Badge variant="outline" className={badgeClass}>
                {b.daysStuck}d stuck
              </Badge>
            </div>

            {b.questions.length > 0 && (
              <div>
                <div className="mono text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)] mb-1">
                  Questions
                </div>
                <ul className="list-disc ml-5 space-y-1 text-xs text-[var(--foreground)]">
                  {b.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {b.nextActions.length > 0 && (
              <div>
                <div className="mono text-[10px] font-semibold tracking-widest uppercase text-emerald-400 mb-1">
                  Next actions
                </div>
                <ul className="list-disc ml-5 space-y-1 text-xs text-[var(--foreground)]">
                  {b.nextActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Tool call timeline ───────────────────────────────────────────────────────

function ToolCallTimeline({ log }: { log: ToolCallLog[] }) {
  return (
    <ol className="border-t divide-y" style={{ borderColor: "var(--border)" }}>
      {log.map((entry, i) => (
        <li key={i} className="p-3 text-xs">
          <div className="mono flex items-center gap-2 text-amber-400">
            → {entry.tool}
          </div>
          <div className="mono text-[10px] text-[var(--muted)] mt-1 truncate">
            in: {JSON.stringify(entry.input)}
          </div>
          <div className="mono text-[10px] text-[var(--muted)] truncate">
            out:{" "}
            {entry.output.length > 160 ? entry.output.slice(0, 160) + "…" : entry.output}
          </div>
        </li>
      ))}
    </ol>
  );
}
