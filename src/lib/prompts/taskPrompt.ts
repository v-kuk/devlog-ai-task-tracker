import type { Task } from "@/types";

export interface BuildTaskPromptInput {
  task: Task;
  parent?: Task | null;
  displayId?: string;
}

export function buildTaskPrompt({ task, parent, displayId }: BuildTaskPromptInput): string {
  const id = displayId ?? task.id;
  const parentBlock = parent
    ? `\nProject / parent task context:\n- Title: ${parent.title}\n- Description: ${parent.description || "(none)"}\n`
    : "";

  return `You are helping implement one task from a larger project.
${parentBlock}
Task (${id}): ${task.title}
Description: ${task.description || "(none)"}
Priority: ${task.priority}
Status: ${task.status}

Please:
1. Propose a focused implementation plan for this task only.
2. Ask one or two clarifying questions if anything is ambiguous before starting.
3. Produce the code / output.

Keep scope tight — only this task, not adjacent ones. Flag anything that seems to bleed into another task.`;
}
