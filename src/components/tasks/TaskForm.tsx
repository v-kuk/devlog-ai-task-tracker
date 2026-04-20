// TODO: Implement TaskForm component
// - Works in "create" mode (no task prop) and "edit" mode (task prop provided)
// - Controlled inputs only — NO <form> tags, NO submit buttons of type="submit"
// - Fields: title (Input), description (Textarea), status (Select), priority (Select)
// - Validate with CreateTaskInputSchema / UpdateTaskInputSchema via Zod before submitting
// - On save, call POST /api/tasks or PATCH /api/tasks/[id]
// - Use Label, Button, Select, Textarea from shadcn/ui

"use client";

import type { Task } from "@/types";

interface TaskFormProps {
  task?: Task;
  onSuccess?: (task: Task) => void;
}

export function TaskForm({ task }: TaskFormProps) {
  // TODO
  return <div>TODO: TaskForm {task ? `(edit ${task.id})` : "(create)"}</div>;
}
