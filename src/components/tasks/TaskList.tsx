"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, PlusCircle } from "lucide-react";
import { TaskCard } from "./TaskCard";
import type { TaskWithMeta } from "@/lib/db";

interface TaskListProps {
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
      <div className="skeleton h-3 w-2/3 rounded-sm mb-3" />
      <div className="skeleton h-3 w-16 rounded-sm" />
    </div>
  );
}

export function TaskList({ tasks, loading, error, onDelete, onEdit, onAiAction, onStatusAction, onRetry, onJumpToParent, onFilterSubtasks, onStatusChange }: TaskListProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="grid gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

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

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-sm border p-12 flex flex-col items-center gap-4 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mono text-5xl text-[var(--border)]">∅</div>
        <div>
          <p className="font-semibold text-[var(--foreground)] mb-1">No tasks yet</p>
          <p className="text-sm text-[var(--muted)]">Create your first task to get started</p>
        </div>
        <button
          onClick={() => router.push("/tasks/new")}
          className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          <PlusCircle size={14} />
          Create first task
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
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
    </div>
  );
}
