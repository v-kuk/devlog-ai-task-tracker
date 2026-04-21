import type { AgentResult } from "@/types";
import { getAllTasks, getTaskById } from "@/lib/db";

export async function runPrioritizeAgent(taskIds?: string[]): Promise<AgentResult> {
  const tasks = taskIds
    ? taskIds.map((id) => getTaskById(id)).filter(Boolean)
    : getAllTasks();

  if (tasks.length === 0) {
    return {
      type: "prioritize",
      content: "No tasks found to prioritize.",
      recommendations: [],
    };
  }

  // Score tasks based on status and current priority to suggest re-ordering
  const recommendations = tasks.map((task) => {
    const t = task!;
    let suggestedPriority = t.priority;
    let reason = "";

    // Tasks that are in-progress but low priority should be bumped up
    if (t.status === "in-progress" && t.priority === "low") {
      suggestedPriority = "medium";
      reason = `"${t.title}" is in progress but marked low priority — consider raising to medium.`;
    }
    // Old todo tasks should be reviewed
    else if (t.status === "todo" && Date.now() - t.createdAt > 7 * 24 * 60 * 60 * 1000) {
      suggestedPriority = t.priority === "low" ? "medium" : "high";
      reason = `"${t.title}" has been in TODO for over a week — consider bumping priority.`;
    }
    // Done tasks don't need priority changes
    else if (t.status === "done") {
      reason = `"${t.title}" is already done.`;
    } else {
      reason = `"${t.title}" — current priority (${t.priority}) seems appropriate.`;
    }

    return {
      taskId: t.id,
      reason,
      suggestedPriority,
    };
  });

  const actionable = recommendations.filter(
    (r) => !r.reason.includes("seems appropriate") && !r.reason.includes("already done")
  );

  const content =
    actionable.length > 0
      ? `Found ${actionable.length} task(s) that may need priority adjustments.`
      : "All tasks appear to have appropriate priorities.";

  return {
    type: "prioritize",
    content,
    recommendations,
  };
}
