"use client";

import { useState, useCallback } from "react";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/types";

interface UseTasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

interface UseTasksReturn extends UseTasksState {
  fetchTasks: (params?: URLSearchParams) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
}

export function useTasks(): UseTasksReturn {
  const [state, setState] = useState<UseTasksState>({
    tasks: [],
    loading: false,
    error: null,
  });

  const fetchTasks = useCallback(async (params?: URLSearchParams) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const qs = params?.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/tasks${qs}`);
      if (!res.ok) throw new Error(`Failed to fetch tasks (${res.status})`);
      const data = (await res.json()) as { tasks: Task[] };
      setState({ tasks: data.tasks, loading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task> => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error: string };
      throw new Error(body.error ?? "Failed to create task");
    }
    const data = (await res.json()) as { task: Task };
    return data.task;
  }, []);

  const updateTask = useCallback(async (id: string, input: UpdateTaskInput): Promise<Task> => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error: string };
      throw new Error(body.error ?? "Failed to update task");
    }
    const data = (await res.json()) as { task: Task };
    return data.task;
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      const body = (await res.json()) as { error: string };
      throw new Error(body.error ?? "Failed to delete task");
    }
  }, []);

  return { ...state, fetchTasks, createTask, updateTask, deleteTask };
}
