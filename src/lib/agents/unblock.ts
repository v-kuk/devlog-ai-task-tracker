import type Anthropic from "@anthropic-ai/sdk";
import type { AgentResult, Task, BlockedTaskReport, ToolCallLog } from "@/types";
import { getAllTasks } from "@/lib/db";
import { runAgentLoop, getAnthropicClient, AGENT_MODEL } from "./loop";

const DAY_MS = 24 * 60 * 60 * 1000;

const tools: Anthropic.Tool[] = [
  {
    name: "identify_blocked_tasks",
    description:
      "Returns in-progress tasks stuck at least `minDaysStuck` days (by updatedAt).",
    input_schema: {
      type: "object",
      properties: { minDaysStuck: { type: "number" } },
      required: ["minDaysStuck"],
    },
  },
  {
    name: "measure_description_complexity",
    description:
      "Returns raw complexity metrics for a task description: character length, conjunction count ('and'/'or'), sentence count. YOU interpret these. No suggestions.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        description: { type: "string" },
      },
      required: ["taskId", "description"],
    },
  },
  {
    name: "record_unblock_report",
    description:
      "Stores YOUR analysis for a blocked task. Call once per blocked task. You write the questions and nextActions — each must be specific to the task, not generic template text. Return the report object back to caller.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        questions: {
          type: "array",
          items: { type: "string" },
          description: "Root-cause questions specific to this task (2-4).",
        },
        nextActions: {
          type: "array",
          items: { type: "string" },
          description: "Concrete next actions doable today (2-4).",
        },
      },
      required: ["taskId", "questions", "nextActions"],
    },
  },
];

const SYSTEM = `You are a team lead helping unblock stuck work.
FLOW:
1. Call identify_blocked_tasks(3) first.
2. For EACH blocked task, call measure_description_complexity to get raw metrics, then reason about what's actually blocking the task.
3. For EACH blocked task, call record_unblock_report with YOUR OWN questions and nextActions — specific to the task title, description, and how long it has been stuck. Never template text like "Review with a teammate". Write concrete, task-specific content.
4. End your turn after all reports are recorded.`;

function daysBetween(a: number, b: number): number {
  return Math.max(0, Math.floor((b - a) / DAY_MS));
}

interface UnblockState {
  reports: Map<string, BlockedTaskReport>;
}

function makeExecutor(tasks: Task[], state: UnblockState) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const now = Date.now();

  return async (name: string, input: unknown) => {
    const args = (input ?? {}) as Record<string, unknown>;

    if (name === "identify_blocked_tasks") {
      const minDays = Number(args.minDaysStuck ?? 3);
      const blocked = tasks
        .filter((t) => t.status === "in-progress")
        .map((t) => ({ task: t, daysStuck: daysBetween(t.updatedAt, now) }))
        .filter((b) => b.daysStuck >= minDays);
      for (const b of blocked) {
        if (!state.reports.has(b.task.id)) {
          state.reports.set(b.task.id, {
            task: b.task,
            daysStuck: b.daysStuck,
            questions: [],
            nextActions: [],
          });
        }
      }
      return blocked;
    }

    if (name === "measure_description_complexity") {
      const id = String(args.taskId);
      const desc = String(args.description ?? byId.get(id)?.description ?? "");
      const charCount = desc.length;
      const conjunctionCount = (desc.match(/\b(and|or)\b/gi) || []).length;
      const sentenceCount = desc.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
      return { taskId: id, charCount, conjunctionCount, sentenceCount };
    }

    if (name === "record_unblock_report") {
      const id = String(args.taskId);
      const questions = Array.isArray(args.questions)
        ? (args.questions as unknown[]).map(String).filter((q) => q.trim().length > 0).slice(0, 6)
        : [];
      const nextActions = Array.isArray(args.nextActions)
        ? (args.nextActions as unknown[]).map(String).filter((a) => a.trim().length > 0).slice(0, 6)
        : [];
      const t = byId.get(id);
      if (!t) return { error: `Task ${id} not found` };

      state.reports.set(id, {
        task: t,
        daysStuck: daysBetween(t.updatedAt, now),
        questions,
        nextActions,
      });

      return { taskId: id, stored: true, questions, nextActions };
    }

    return { error: `Unknown tool: ${name}` };
  };
}

export interface UnblockOpts {
  tasks?: Task[];
  onToolCall?: (entry: ToolCallLog) => void;
}

export async function runUnblockingAgent(opts: UnblockOpts = {}): Promise<AgentResult> {
  const client = getAnthropicClient();
  const taskList = opts.tasks ?? getAllTasks({ status: "in-progress" });

  if (!client) {
    return {
      type: "unblock",
      content: "",
      mocked: true,
      notice: "Set ANTHROPIC_API_KEY to enable real AI",
      blockedTasks: [],
      summary: "Mock response — add API key",
      toolCallLog: [],
    };
  }

  const state: UnblockState = { reports: new Map() };

  const summary = taskList.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    description: t.description.slice(0, 300),
    updatedAt: new Date(t.updatedAt).toISOString(),
  }));

  const { text, toolCallLog } = await runAgentLoop({
    client,
    model: AGENT_MODEL,
    maxTokens: 2048,
    system: SYSTEM,
    tools,
    initialMessages: [
      {
        role: "user",
        content: `In-progress tasks:\n${JSON.stringify(summary, null, 2)}\n\nUnblock them.`,
      },
    ],
    executeTool: makeExecutor(taskList, state),
    onToolCall: opts.onToolCall,
  });

  return {
    type: "unblock",
    content: text,
    blockedTasks: Array.from(state.reports.values()),
    toolCallLog,
  };
}

export async function runUnblockAgent(_taskId?: string): Promise<AgentResult> {
  void _taskId;
  return runUnblockingAgent();
}
