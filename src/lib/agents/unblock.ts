import type Anthropic from "@anthropic-ai/sdk";
import type { AgentResult, Task, BlockedTaskReport } from "@/types";
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
    name: "analyze_complexity",
    description:
      "Analyzes task description for scope/complexity. Returns { isTooBig, suggestion }.",
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
    name: "generate_unblock_plan",
    description:
      "Generates concrete questions + nextActions for a blocked task. Pass specific issues[] found.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        issues: { type: "array", items: { type: "string" } },
      },
      required: ["taskId", "issues"],
    },
  },
];

const SYSTEM = `You are a team lead helping unblock stuck work.
FLOW:
1. Call identify_blocked_tasks(3) first
2. For EACH blocked task call analyze_complexity
3. For EACH blocked task call generate_unblock_plan with specific issues found
Be concrete. No generic advice.
Questions should identify ROOT CAUSE.
Next actions must be specific and doable today.`;

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

    if (name === "analyze_complexity") {
      const id = String(args.taskId);
      const desc = String(args.description ?? byId.get(id)?.description ?? "");
      const len = desc.length;
      const hasAnd = (desc.match(/\band\b/gi) || []).length;
      const isTooBig = len > 400 || hasAnd >= 4;
      return {
        taskId: id,
        isTooBig,
        suggestion: isTooBig
          ? "Task covers multiple concerns — split into focused subtasks."
          : "Scope looks reasonable — focus on a concrete next step.",
      };
    }

    if (name === "generate_unblock_plan") {
      const id = String(args.taskId);
      const issues = Array.isArray(args.issues) ? (args.issues as string[]).map(String) : [];
      const t = byId.get(id);
      if (!t) return { error: `Task ${id} not found` };

      const questions = issues.length
        ? issues.slice(0, 3).map((iss) => `What is blocking resolution of: ${iss}?`)
        : [`What specific step is blocking progress on "${t.title}"?`];
      const nextActions = [
        `Review "${t.title}" with a teammate for 15 minutes today.`,
        `Write down the single smallest next step and commit it before EOD.`,
      ];

      const existing = state.reports.get(id);
      if (existing) {
        existing.questions = questions;
        existing.nextActions = nextActions;
      } else {
        state.reports.set(id, {
          task: t,
          daysStuck: daysBetween(t.updatedAt, now),
          questions,
          nextActions,
        });
      }

      return { taskId: id, questions, nextActions };
    }

    return { error: `Unknown tool: ${name}` };
  };
}

export async function runUnblockingAgent(tasks?: Task[]): Promise<AgentResult> {
  const client = getAnthropicClient();
  const taskList = tasks ?? getAllTasks({ status: "in-progress" });

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
