// TODO: Implement AgentPanel component
// - Rendered on the task edit page alongside TaskForm
// - Three action buttons: "Prioritize", "Decompose", "Unblock"
// - Uses useAgent hook to call the relevant agent endpoint
// - Displays AgentResult: content (markdown), subtasks[], recommendations[], toolCallLog[]
// - Shows loading spinner during agent run
// - Shows needsClarification question if agent returns one
// - Uses Sheet or Dialog from shadcn/ui for expanded result view

"use client";

import type { Task } from "@/types";

interface AgentPanelProps {
  task: Task;
}

export function AgentPanel({ task }: AgentPanelProps) {
  // TODO
  return <div>TODO: AgentPanel for task {task.id}</div>;
}
