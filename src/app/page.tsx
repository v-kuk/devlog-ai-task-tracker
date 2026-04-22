"use client";

import { useEffect, useCallback, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Cpu, Zap, ArrowUpDown } from "lucide-react";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { AgentPanel } from "@/components/agents/AgentPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTasks } from "@/hooks/useTasks";
import { useCommandKey } from "@/hooks/useCommandKey";
import type { Task } from "@/types";
import type { AgentMode } from "@/hooks/useAgent";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tasks, loading, error, fetchTasks, deleteTask } = useTasks();

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<AgentMode>("prioritize");
  const [panelTask, setPanelTask] = useState<Task | undefined>();

  useEffect(() => {
    fetchTasks(new URLSearchParams(searchParams.toString()));
  }, [searchParams, fetchTasks]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteTask(id);
      fetchTasks(new URLSearchParams(searchParams.toString()));
    },
    [deleteTask, fetchTasks, searchParams]
  );

  const handleEdit = useCallback(
    (id: string) => router.push(`/tasks/${id}/edit`),
    [router]
  );

  const openPanel = useCallback((mode: AgentMode, task?: Task) => {
    setPanelMode(mode);
    setPanelTask(task);
    setPanelOpen(true);
  }, []);

  const handleAiAction = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      openPanel("decompose", task);
    },
    [tasks, openPanel]
  );

  const closePanel = useCallback(() => setPanelOpen(false), []);

  const handleTasksChanged = useCallback(() => {
    fetchTasks(new URLSearchParams(searchParams.toString()));
  }, [fetchTasks, searchParams]);

  useCommandKey("k", () => router.push("/tasks/new"));

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Cpu size={18} className="text-amber-400 shrink-0" />
            <span className="font-semibold tracking-tight text-[var(--foreground)]">DevLog</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => openPanel("prioritize")}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs rounded-sm border transition-colors hover:border-[var(--border-hover)] hover:text-amber-400"
              style={{ borderColor: "var(--border)", color: "var(--muted)", background: "transparent" }}
              title="Prioritize my day"
            >
              <ArrowUpDown size={12} />
              <span className="mono hidden sm:inline">Prioritize</span>
            </button>
            <button
              onClick={() => openPanel("unblock")}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs rounded-sm border transition-colors hover:border-[var(--border-hover)] hover:text-amber-400"
              style={{ borderColor: "var(--border)", color: "var(--muted)", background: "transparent" }}
              title="Scan for blockers"
            >
              <Zap size={12} />
              <span className="mono hidden sm:inline">Scan for blockers</span>
            </button>
            <span
              className="mono text-[10px] px-2 py-0.5 rounded-sm border whitespace-nowrap"
              style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface-2)" }}
              title="Task count"
            >
              {loading ? "…" : tasks.length} tasks
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <TaskFilters />
        </div>

        <TaskList
          tasks={tasks}
          loading={loading}
          error={error}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onAiAction={handleAiAction}
          onRetry={() => fetchTasks(new URLSearchParams(searchParams.toString()))}
        />
      </main>

      <button
        onClick={() => router.push("/tasks/new")}
        className="fixed bottom-8 right-8 w-12 h-12 rounded-sm flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 z-50"
        style={{ background: "var(--accent)", color: "#000" }}
        title="New task"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      <ErrorBoundary fallbackLabel="Agent panel crashed" onReset={closePanel}>
        <AgentPanel
          open={panelOpen}
          mode={panelMode}
          task={panelTask}
          onClose={closePanel}
          onTasksChanged={handleTasksChanged}
        />
      </ErrorBoundary>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
