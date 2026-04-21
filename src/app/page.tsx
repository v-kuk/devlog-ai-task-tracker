"use client";

import { useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Cpu, Zap } from "lucide-react";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { useTasks } from "@/hooks/useTasks";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tasks, loading, error, fetchTasks, deleteTask } = useTasks();

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

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu size={18} className="text-amber-400" />
            <span className="font-semibold tracking-tight text-[var(--foreground)]">DevLog</span>
            <span
              className="mono text-[10px] px-2 py-0.5 rounded-sm border"
              style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface-2)" }}
            >
              {loading ? "…" : tasks.length} tasks
            </span>
          </div>

          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-sm border transition-colors hover:border-[var(--border-hover)] hover:text-amber-400"
            style={{ borderColor: "var(--border)", color: "var(--muted)", background: "transparent" }}
            title="Scan for blockers (coming soon)"
          >
            <Zap size={12} />
            <span className="mono">Scan for blockers</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="mb-6">
          <TaskFilters />
        </div>

        {/* Task list */}
        <TaskList
          tasks={tasks}
          loading={loading}
          error={error}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onRetry={() => fetchTasks(new URLSearchParams(searchParams.toString()))}
        />
      </main>

      {/* Floating add button */}
      <button
        onClick={() => router.push("/tasks/new")}
        className="fixed bottom-8 right-8 w-12 h-12 rounded-sm flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 z-50"
        style={{ background: "var(--accent)", color: "#000" }}
        title="New task"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
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
