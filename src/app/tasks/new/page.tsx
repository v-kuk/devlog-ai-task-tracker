"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { useTasks } from "@/hooks/useTasks";
import type { CreateTaskInput, Task } from "@/types";

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createTask } = useTasks();
  const [isLoading, setIsLoading] = useState(false);

  const statusParam = searchParams.get("status") as Task["status"] | null;

  const handleSubmit = useCallback(
    async (data: CreateTaskInput) => {
      setIsLoading(true);
      try {
        await createTask(data);
        router.back();
      } finally {
        setIsLoading(false);
      }
    },
    [createTask, router]
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Back nav */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm mb-8 transition-colors hover:text-[var(--foreground)]"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft size={14} />
          <span className="mono">Back to tasks</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-1">New task</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Add something to track
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-sm border p-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <TaskForm
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={isLoading}
            initialValues={statusParam ? { status: statusParam } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
