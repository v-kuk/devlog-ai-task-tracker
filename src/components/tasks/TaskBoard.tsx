"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, PlusCircle } from "lucide-react";
import { TaskCard } from "./TaskCard";
import type { TaskWithMeta } from "@/lib/db";

interface TaskBoardProps {
  tasks: TaskWithMeta[];
  loading: boolean;
  error: string | null;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onAiAction?: (id: string) => void;
  onStatusAction?: (id: string) => void;
  onRetry?: () => void;
  onJumpToParent?: (id: string) => void;
  onFilterSubtasks?: (id: string) => void;
  onStatusChange?: (id: string, status: import("@/types").Task["status"]) => void;
}

const COLUMNS = [
  { status: "todo" as const,        label: "Todo",        borderColor: "var(--border)", dot: "bg-zinc-400" },
  { status: "in-progress" as const, label: "In Progress", borderColor: "#3b82f6",       dot: "bg-blue-400" },
  { status: "done" as const,        label: "Done",        borderColor: "#10b981",       dot: "bg-emerald-400" },
];

function SkeletonCard() {
  return (
    <div
      className="rounded-sm border p-4 pl-5 relative overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 skeleton" />
      <div className="flex items-center gap-2 mb-3">
        <div className="skeleton h-4 w-16 rounded-sm" />
        <div className="skeleton h-4 w-10 rounded-sm" />
      </div>
      <div className="skeleton h-4 w-3/4 rounded-sm mb-2" />
      <div className="skeleton h-3 w-full rounded-sm mb-1" />
      <div className="skeleton h-3 w-2/3 rounded-sm" />
    </div>
  );
}

export function TaskBoard({
  tasks,
  loading,
  error,
  onDelete,
  onEdit,
  onAiAction,
  onStatusAction,
  onRetry,
  onJumpToParent,
  onFilterSubtasks,
  onStatusChange,
}: TaskBoardProps) {
  const router = useRouter();

  if (error) {
    return (
      <div
        className="rounded-sm border p-8 flex flex-col items-center gap-4 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <AlertCircle size={32} className="text-red-400" />
        <div>
          <p className="font-semibold text-[var(--foreground)] mb-1">Failed to load tasks</p>
          <p className="text-sm text-[var(--muted)]">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors"
            style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      {COLUMNS.map(({ status, label, borderColor, dot }) => {
        const col = loading ? [] : tasks.filter((t) => t.status === status);

        return (
          <div key={status} className="flex flex-col gap-3 min-w-0">
            <div
              className="flex items-center gap-2 pb-2 border-b"
              style={{ borderColor }}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <span className="mono text-xs font-semibold text-[var(--foreground)]">{label}</span>
              <span className="mono text-[10px] text-[var(--muted)] ml-auto">
                {loading ? "…" : col.length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : col.length === 0 ? (
                <div
                  className="rounded-sm border border-dashed p-6 flex flex-col items-center gap-2 text-center"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="mono text-2xl text-[var(--border)]">∅</span>
                  <span className="mono text-[10px] text-[var(--muted)]">No tasks</span>
                  <button
                    onClick={() => router.push(`/tasks/new?status=${status}`)}
                    className="flex items-center gap-1.5 mono text-[10px] px-2 py-1 rounded-sm border transition-colors hover:border-amber-500 hover:text-amber-400 mt-1"
                    style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                  >
                    <PlusCircle size={10} />
                    Add task
                  </button>
                </div>
              ) : (
                <>
                  {col.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onAiAction={onAiAction}
                      onStatusAction={onStatusAction}
                      onJumpToParent={onJumpToParent}
                      onFilterSubtasks={onFilterSubtasks}
                      onStatusChange={onStatusChange}
                    />
                  ))}
                  <button
                    onClick={() => router.push(`/tasks/new?status=${status}`)}
                    className="flex items-center gap-1.5 mono text-[10px] px-2 py-1 rounded-sm border transition-colors hover:border-amber-500 hover:text-amber-400 self-start"
                    style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                  >
                    <PlusCircle size={10} />
                    Add task
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
