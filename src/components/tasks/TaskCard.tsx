"use client";

import { useState, useCallback } from "react";
import { Pencil, Trash2, Sparkles, Clock } from "lucide-react";
import type { Task } from "@/types";
import type { TaskWithMeta } from "@/lib/db";
import { displayId } from "@/lib/utils";

interface TaskCardProps {
  task: Task | TaskWithMeta;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onAiAction?: (id: string) => void;
  onJumpToParent?: (id: string) => void;
}

const STATUS_STYLES: Record<Task["status"], { label: string; className: string }> = {
  todo:        { label: "TODO",        className: "bg-zinc-800 text-zinc-300 border-zinc-600" },
  "in-progress": { label: "IN PROGRESS", className: "bg-blue-950 text-blue-300 border-blue-700" },
  done:        { label: "DONE",        className: "bg-emerald-950 text-emerald-300 border-emerald-700" },
};

const PRIORITY_STYLES: Record<Task["priority"], { label: string; className: string; dot: string }> = {
  low:    { label: "LOW",    className: "text-emerald-400", dot: "bg-emerald-400" },
  medium: { label: "MED",    className: "text-amber-400",   dot: "bg-amber-400" },
  high:   { label: "HIGH",   className: "text-red-400",     dot: "bg-red-400" },
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function TaskCard({ task, onDelete, onEdit, onAiAction, onJumpToParent }: TaskCardProps) {
  const parentTitle = "parentTitle" in task ? task.parentTitle : null;
  const subtaskCount = "subtaskCount" in task ? task.subtaskCount : 0;
  const [confirming, setConfirming] = useState(false);

  const status = STATUS_STYLES[task.status];
  const priority = PRIORITY_STYLES[task.priority];

  const handleDeleteClick = useCallback(() => {
    if (confirming) {
      onDelete(task.id);
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  }, [confirming, onDelete, task.id]);

  return (
    <div
      data-task-id={task.id}
      className="fade-up group relative rounded-sm border transition-all duration-150 hover:border-[var(--border-hover)]"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Priority stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-sm ${priority.dot}`}
      />

      <div className="p-4 pl-5">
        {/* Top row: badges + actions */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`mono text-[10px] font-600 tracking-widest px-2 py-0.5 rounded-sm border ${status.className}`}
            >
              {status.label}
            </span>
            <span className={`mono text-[10px] font-600 tracking-widest flex items-center gap-1 ${priority.className}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${priority.dot}`} />
              {priority.label}
            </span>
          </div>

          {/* Action buttons — always visible on touch, hover-only on desktop */}
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => onEdit(task.id)}
              className="p-1.5 rounded-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
              title="Edit task"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={handleDeleteClick}
              className={`p-1.5 rounded-sm transition-colors ${
                confirming
                  ? "bg-red-900 text-red-300 hover:bg-red-800"
                  : "text-[var(--muted)] hover:text-red-400 hover:bg-[var(--surface-2)]"
              }`}
              title={confirming ? "Click again to confirm" : "Delete task"}
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={() => (onAiAction ?? onEdit)(task.id)}
              className="p-1.5 rounded-sm text-[var(--muted)] hover:text-amber-400 hover:bg-[var(--surface-2)] transition-colors"
              title="AI Actions"
            >
              <Sparkles size={13} />
            </button>
          </div>
        </div>

        {/* Parent chip */}
        {task.parentTaskId && parentTitle && (
          <button
            onClick={() => onJumpToParent?.(task.parentTaskId!)}
            className="flex items-center gap-1 text-[10px] mono text-[var(--muted)] hover:text-amber-400 mb-1"
          >
            ↳ Subtask of <span className="truncate max-w-[200px] ml-1">{parentTitle}</span>
          </button>
        )}

        {/* Title */}
        <h3 className="font-semibold text-[var(--foreground)] text-sm leading-snug mb-1">
          <span className="mono text-[10px] text-[var(--muted)] mr-1">{displayId(task.sequence)}</span>
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed mb-3">
            {task.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1 mt-2">
          <Clock size={10} className="text-[var(--muted)]" />
          <span className="mono text-[10px] text-[var(--muted)]">
            {relativeTime(task.createdAt)}
          </span>
          {(subtaskCount ?? 0) > 0 && (
            <span className="mono text-[10px] px-1.5 py-0.5 rounded-sm border" style={{ borderColor: "var(--border)" }}>
              {subtaskCount} subtasks
            </span>
          )}
          {confirming && (
            <span className="ml-auto text-[10px] text-red-400 mono animate-pulse">
              click again to confirm
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
