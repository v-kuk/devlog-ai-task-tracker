"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, GitBranch, ArrowUpDown, Zap } from "lucide-react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { AgentPanel } from "@/components/agents/AgentPanel";
import { useTasks } from "@/hooks/useTasks";
import type { Task, CreateTaskInput } from "@/types";
import type { AgentMode } from "@/hooks/useAgent";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTaskPage({ params }: EditPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { updateTask } = useTasks();
  const [task, setTask]       = useState<Task | null>(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<AgentMode>("decompose");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/tasks/${id}`);
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error("Failed to load task");
        const data = (await res.json()) as { task: Task };
        setTask(data.task);
      } catch {
        setNotFound(true);
      } finally {
        setFetching(false);
      }
    })();
  }, [id]);

  const handleSubmit = useCallback(
    async (data: CreateTaskInput) => {
      setIsLoading(true);
      try {
        await updateTask(id, data);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    },
    [updateTask, id, router]
  );

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 size={24} className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--background)" }}>
        <p className="mono text-[var(--muted)]">Task not found</p>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--accent)" }}
        >
          <ArrowLeft size={14} /> Back to tasks
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm mb-8 transition-colors hover:text-[var(--foreground)]"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft size={14} />
          <span className="mono">Back to tasks</span>
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-1">Edit task</h1>
          <p className="mono text-xs" style={{ color: "var(--muted)" }}>{task.id}</p>
        </div>

        <div
          className="rounded-sm border p-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <TaskForm
            initialValues={task}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/")}
            isLoading={isLoading}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => { setPanelMode("decompose"); setPanelOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 text-xs rounded-sm border transition-colors hover:border-[var(--border-hover)] hover:text-amber-400 hover:bg-[var(--surface-2)]"
            style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface)" }}
          >
            <GitBranch size={13} />
            <span className="mono">Decompose</span>
          </button>
          <button
            onClick={() => { setPanelMode("prioritize"); setPanelOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 text-xs rounded-sm border transition-colors hover:border-[var(--border-hover)] hover:text-amber-400 hover:bg-[var(--surface-2)]"
            style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface)" }}
          >
            <ArrowUpDown size={13} />
            <span className="mono">Prioritize</span>
          </button>
          <button
            onClick={() => { setPanelMode("unblock"); setPanelOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 text-xs rounded-sm border transition-colors hover:border-[var(--border-hover)] hover:text-amber-400 hover:bg-[var(--surface-2)]"
            style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface)" }}
          >
            <Zap size={13} />
            <span className="mono">Unblock</span>
          </button>
        </div>

        <AgentPanel
          open={panelOpen}
          mode={panelMode}
          task={task}
          onClose={() => setPanelOpen(false)}
        />
      </div>
    </div>
  );
}
