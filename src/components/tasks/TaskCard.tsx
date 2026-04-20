// TODO: Implement TaskCard component
// - Display task title, description (truncated), status badge, priority badge
// - Link to /tasks/[id]/edit
// - Delete button with confirmation (no <form> tags — onClick only)
// - Use Card, Badge from shadcn/ui

import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onDelete?: (id: string) => void;
}

export function TaskCard({ task }: TaskCardProps) {
  // TODO
  return <div>{task.title}</div>;
}
