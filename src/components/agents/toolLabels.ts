type ToolInput = Record<string, unknown>;

export interface ToolLabel {
  label: string;
  summary: (input: ToolInput) => string;
}

export const TOOL_LABELS: Record<string, ToolLabel> = {
  assess_clarity:              { label: "Checking task clarity",        summary: () => "" },
  request_clarification:       { label: "Asking clarifying question",   summary: (i) => String(i.question ?? "") },
  create_subtask:              { label: "Creating subtask",             summary: (i) => String(i.title ?? "") },
  keep_subtask:                { label: "Keeping existing subtask",     summary: (i) => String(i.id ?? "") },
  delete_subtask:              { label: "Removing obsolete subtask",    summary: (i) => String(i.id ?? "") },
  finalize_decomposition:      { label: "Wrapping up",                  summary: (i) => String(i.summary ?? "") },
  // prioritize agent
  analyze_task_age:            { label: "Reading task age",             summary: (i) => String(i.taskId ?? "") },
  get_blocked_tasks:           { label: "Scanning blocked tasks",       summary: () => "" },
  calculate_priority_score:    { label: "Scoring priority",             summary: (i) => String(i.taskId ?? "") },
  // unblock agent
  identify_blocked_tasks:      { label: "Finding stuck tasks",          summary: () => "" },
  measure_description_complexity: { label: "Assessing complexity",      summary: (i) => String(i.taskId ?? "") },
  record_unblock_report:       { label: "Drafting action plan",         summary: (i) => String(i.taskId ?? "") },
};

export function labelFor(tool: string, input: unknown): { label: string; summary: string } {
  const entry = TOOL_LABELS[tool];
  const safeInput = (input ?? {}) as ToolInput;
  if (!entry) return { label: tool.replace(/_/g, " "), summary: "" };
  return { label: entry.label, summary: entry.summary(safeInput) };
}
