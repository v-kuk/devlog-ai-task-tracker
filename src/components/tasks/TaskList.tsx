// TODO: Implement TaskList component
// - Receives tasks from useTasks hook (passed as prop or via hook internally)
// - Renders a TaskCard for each task
// - Handles empty state
// - Handles loading skeleton state

import type { Task } from "@/types";
import { TaskCard } from "./TaskCard";

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
}

export function TaskList({ tasks }: TaskListProps) {
  // TODO
  return (
    <div>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
