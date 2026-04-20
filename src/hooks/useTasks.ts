// TODO: Implement useTasks hook
// - Fetches tasks from GET /api/tasks with current filters
// - Filters come from URL search params (passed in as argument)
// - Returns: { tasks, isLoading, error, refetch, deleteTask, createTask }
// - deleteTask calls DELETE /api/tasks/[id] then refetches
// - createTask calls POST /api/tasks then refetches
// - No optimistic updates needed for Step 1

import type { Task, TaskFilters } from "@/types";

interface UseTasksResult {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  deleteTask: (id: string) => Promise<void>;
}

export function useTasks(_filters?: TaskFilters): UseTasksResult {
  // TODO
  return {
    tasks: [],
    isLoading: false,
    error: null,
    refetch: () => {},
    deleteTask: async () => {},
  };
}
