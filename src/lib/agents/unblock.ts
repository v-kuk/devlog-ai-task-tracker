import type { AgentResult } from "@/types";
import { getTaskById } from "@/lib/db";

export async function runUnblockAgent(taskId: string): Promise<AgentResult> {
  const task = getTaskById(taskId);
  if (!task) {
    return {
      type: "unblock",
      content: "Task not found.",
    };
  }

  const title = task.title.toLowerCase();
  const desc = (task.description || "").toLowerCase();
  const combined = `${title} ${desc}`;

  const suggestions: string[] = [];

  // Provide contextual unblock suggestions
  if (task.status === "done") {
    return {
      type: "unblock",
      content: `"${task.title}" is already marked as done — no blockers to resolve.`,
    };
  }

  if (task.status === "todo") {
    suggestions.push(
      "This task hasn't been started yet. Consider setting it to 'in-progress' if you're ready to work on it.",
    );
  }

  if (combined.includes("api") || combined.includes("endpoint") || combined.includes("backend")) {
    suggestions.push(
      "If waiting on an API: try mocking the endpoint locally so frontend work can proceed independently.",
    );
  }

  if (combined.includes("review") || combined.includes("approval") || combined.includes("feedback")) {
    suggestions.push(
      "If blocked on a review: consider pinging the reviewer directly or finding an alternate reviewer.",
    );
  }

  if (combined.includes("design") || combined.includes("ux") || combined.includes("ui")) {
    suggestions.push(
      "If waiting on designs: start with a wireframe or low-fidelity version and iterate once final designs arrive.",
    );
  }

  if (combined.includes("test") || combined.includes("ci") || combined.includes("pipeline")) {
    suggestions.push(
      "If CI/tests are blocking: check for flaky tests or environment issues. Try running tests locally first.",
    );
  }

  // Default suggestions
  if (suggestions.length === 0) {
    suggestions.push(
      "Break the task into smaller pieces — sometimes a blocker only affects one part.",
      "Timebox the blocker: if it's not resolved in 30 minutes, escalate or switch to a different approach.",
      "Check if there's a simpler alternative approach that avoids the blocker entirely.",
    );
  }

  // If the task has been sitting for a while, add a note
  const ageInDays = Math.floor((Date.now() - task.createdAt) / (1000 * 60 * 60 * 24));
  if (ageInDays > 3) {
    suggestions.push(
      `This task is ${ageInDays} days old. If it's been blocked this long, consider re-scoping or deprioritizing it.`,
    );
  }

  return {
    type: "unblock",
    content: suggestions.join("\n\n"),
  };
}
