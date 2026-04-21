"use client";

import { ArrowUpDown, GitBranch, Zap, Loader2, X, AlertCircle } from "lucide-react";
import { useAgent } from "@/hooks/useAgent";
import type { Task } from "@/types";

interface AgentPanelProps {
  task: Task;
}

const AGENT_ACTIONS = [
  {
    type: "prioritize" as const,
    label: "Prioritize",
    description: "Analyze and suggest priority",
    icon: ArrowUpDown,
    color: "text-amber-400",
  },
  {
    type: "decompose" as const,
    label: "Decompose",
    description: "Break into subtasks",
    icon: GitBranch,
    color: "text-blue-400",
  },
  {
    type: "unblock" as const,
    label: "Unblock",
    description: "Suggest ways to unblock",
    icon: Zap,
    color: "text-emerald-400",
  },
] as const;

export function AgentPanel({ task }: AgentPanelProps) {
  const { result, isLoading, error, runAgent, clearResult } = useAgent();

  return (
    <div
      className="rounded-sm border p-5"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
        AI Actions
      </h3>
      <p className="text-xs text-[var(--muted)] mb-4">
        Use AI to analyze and help with this task
      </p>

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        {AGENT_ACTIONS.map((action) => (
          <button
            key={action.type}
            onClick={() => runAgent(action.type, task.id)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-xs rounded-sm border transition-colors hover:border-[var(--border-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-2)",
              color: "var(--foreground)",
            }}
          >
            {isLoading && result === null ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <action.icon size={13} className={action.color} />
            )}
            <span className="mono">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-sm border text-xs mb-4"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            borderColor: "rgba(239, 68, 68, 0.3)",
            color: "rgb(252, 165, 165)",
          }}
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 p-4 text-xs text-[var(--muted)]">
          <Loader2 size={14} className="animate-spin" />
          <span className="mono">Running agent…</span>
        </div>
      )}

      {/* Result display */}
      {result && !isLoading && (
        <div
          className="rounded-sm border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="mono text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">
              {result.type} result
            </span>
            <button
              onClick={clearResult}
              className="p-1 rounded-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          {/* Content */}
          <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap mb-3">
            {result.content}
          </p>

          {/* Subtasks */}
          {result.subtasks && result.subtasks.length > 0 && (
            <div className="mt-3">
              <span className="mono text-[10px] text-[var(--muted)] font-semibold tracking-widest uppercase block mb-2">
                Subtasks
              </span>
              <ul className="space-y-2">
                {result.subtasks.map((sub, i) => (
                  <li
                    key={i}
                    className="text-xs p-2 rounded-sm border"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  >
                    <span className="font-medium text-[var(--foreground)]">{sub.title}</span>
                    {sub.description && (
                      <p className="text-[var(--muted)] mt-0.5">{sub.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="mt-3">
              <span className="mono text-[10px] text-[var(--muted)] font-semibold tracking-widest uppercase block mb-2">
                Recommendations
              </span>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="text-xs p-2 rounded-sm border"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  >
                    <span className="text-[var(--foreground)]">{rec.reason}</span>
                    <span className="ml-2 mono text-[10px] text-amber-400">
                      → {rec.suggestedPriority}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Clarification question */}
          {result.needsClarification && result.question && (
            <div
              className="mt-3 p-3 rounded-sm border text-xs"
              style={{
                background: "rgba(251, 191, 36, 0.1)",
                borderColor: "rgba(251, 191, 36, 0.3)",
                color: "rgb(253, 224, 71)",
              }}
            >
              <span className="font-medium">Needs clarification:</span> {result.question}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
