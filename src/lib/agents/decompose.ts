import type { AgentResult } from "@/types";
import { getTaskById } from "@/lib/db";

export async function runDecomposeAgent(taskId: string): Promise<AgentResult> {
  const task = getTaskById(taskId);
  if (!task) {
    return {
      type: "decompose",
      content: "Task not found.",
    };
  }

  // Generate subtasks based on the task title and description
  const title = task.title.toLowerCase();
  const subtasks: Array<{ title: string; description: string; priority: "low" | "medium" | "high" }> = [];

  // Heuristic decomposition based on common patterns
  if (title.includes("implement") || title.includes("build") || title.includes("create")) {
    subtasks.push(
      { title: `Design approach for: ${task.title}`, description: "Outline the technical approach and identify dependencies.", priority: "high" },
      { title: `Implement core logic`, description: `Build the main functionality for "${task.title}".`, priority: "high" },
      { title: `Add error handling`, description: "Handle edge cases and error states.", priority: "medium" },
      { title: `Write tests`, description: `Add unit and integration tests for "${task.title}".`, priority: "medium" },
      { title: `Code review and cleanup`, description: "Review implementation, clean up code, update docs.", priority: "low" },
    );
  } else if (title.includes("fix") || title.includes("bug") || title.includes("debug")) {
    subtasks.push(
      { title: `Reproduce the issue`, description: `Set up conditions to reliably reproduce the problem in "${task.title}".`, priority: "high" },
      { title: `Identify root cause`, description: "Debug and trace the issue to its source.", priority: "high" },
      { title: `Implement fix`, description: "Apply the fix and verify it resolves the issue.", priority: "high" },
      { title: `Add regression test`, description: "Write a test to prevent this issue from recurring.", priority: "medium" },
    );
  } else {
    subtasks.push(
      { title: `Research: ${task.title}`, description: "Gather information and understand requirements.", priority: "medium" },
      { title: `Plan approach`, description: `Decide on the best approach for "${task.title}".`, priority: "medium" },
      { title: `Execute`, description: "Do the main work.", priority: "high" },
      { title: `Review and verify`, description: "Check the work is complete and correct.", priority: "low" },
    );
  }

  return {
    type: "decompose",
    content: `Decomposed "${task.title}" into ${subtasks.length} subtasks.`,
    subtasks,
  };
}
