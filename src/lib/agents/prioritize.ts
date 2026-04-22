import type Anthropic from "@anthropic-ai/sdk";
import type { AgentResult, Task, AgentRecommendation, ToolCallLog } from "@/types";
import { getAllTasks } from "@/lib/db";
import { runAgentLoop, getAnthropicClient, AGENT_MODEL } from "./loop";

const DAY_MS = 24 * 60 * 60 * 1000;

const tools: Anthropic.Tool[] = [
  {
    name: "analyze_task_age",
    description: "Returns how many days old a task is (based on createdAt).",
    input_schema: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
    },
  },
  {
    name: "get_blocked_tasks",
    description:
      "Returns tasks stuck in 'in-progress' for more than 3 days with days-in-progress count.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "calculate_priority_score",
    description:
      "Computes a 0-100 priority score given factors. Pass comma-separated factor names like 'age,priority,blocked'.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        factors: { type: "string" },
      },
      required: ["taskId", "factors"],
    },
  },
];

const SYSTEM = `You are a senior engineering team lead analyzing a task list.
Recommend top 3 tasks to work on today.
RULES:
- You MUST call analyze_task_age for at least 3 tasks
- You MUST call get_blocked_tasks before making recommendations
- Consider: priority level, task age, blocked tasks, momentum
- Do NOT just sort by priority field
- For each recommendation explain WHY in 1-2 sentences

After calling tools, return a final JSON object in this exact shape (no markdown fences):
{"recommendations":[{"taskId":"...","title":"...","reason":"..."}],"summary":"..."}`;

function daysBetween(a: number, b: number): number {
  return Math.max(0, Math.floor((b - a) / DAY_MS));
}

function priorityWeight(p: Task["priority"]): number {
  return p === "high" ? 40 : p === "medium" ? 25 : 10;
}

function makeExecutor(tasks: Task[]) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const now = Date.now();

  return async (name: string, input: unknown) => {
    const args = (input ?? {}) as Record<string, unknown>;

    if (name === "analyze_task_age") {
      const id = String(args.taskId);
      const t = byId.get(id);
      if (!t) return { error: `Task ${id} not found` };
      return { taskId: id, daysOld: daysBetween(t.createdAt, now) };
    }

    if (name === "get_blocked_tasks") {
      const blocked = tasks
        .filter((t) => t.status === "in-progress")
        .map((t) => ({
          id: t.id,
          title: t.title,
          daysInProgress: daysBetween(t.updatedAt, now),
        }))
        .filter((b) => b.daysInProgress >= 3);
      return { blockedTasks: blocked };
    }

    if (name === "calculate_priority_score") {
      const id = String(args.taskId);
      const factors = String(args.factors ?? "");
      const t = byId.get(id);
      if (!t) return { error: `Task ${id} not found` };

      let score = 0;
      const parts: string[] = [];
      if (factors.includes("priority")) {
        const w = priorityWeight(t.priority);
        score += w;
        parts.push(`priority(${t.priority})=${w}`);
      }
      if (factors.includes("age")) {
        const age = Math.min(30, daysBetween(t.createdAt, now));
        score += age;
        parts.push(`age=${age}`);
      }
      if (factors.includes("blocked") && t.status === "in-progress") {
        const stuck = daysBetween(t.updatedAt, now);
        const w = Math.min(30, stuck * 5);
        score += w;
        parts.push(`stuck=${w}`);
      }
      return {
        taskId: id,
        score: Math.min(100, score),
        reasoning: parts.join(", ") || "no factors applied",
      };
    }

    return { error: `Unknown tool: ${name}` };
  };
}

interface AgentOutput {
  recommendations: AgentRecommendation[];
  summary: string;
}

function parseOutput(text: string, tasks: Task[]): AgentOutput {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) {
    return { recommendations: [], summary: text.trim() };
  }
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    return {
      recommendations: recs.map((r: Record<string, unknown>) => ({
        taskId: String(r.taskId),
        title: String(r.title ?? byId.get(String(r.taskId))?.title ?? ""),
        reason: String(r.reason ?? ""),
      })),
      summary: String(parsed.summary ?? ""),
    };
  } catch {
    return { recommendations: [], summary: text.trim() };
  }
}

export interface PrioritizeOpts {
  tasks?: Task[];
  onToolCall?: (entry: ToolCallLog) => void;
}

export async function runPrioritizationAgent(
  opts: PrioritizeOpts = {}
): Promise<AgentResult> {
  const client = getAnthropicClient();
  const taskList = opts.tasks ?? getAllTasks();

  if (!client) {
    return {
      type: "prioritize",
      content: "",
      mocked: true,
      notice: "Set ANTHROPIC_API_KEY to enable real AI",
      recommendations: taskList.slice(0, 1).map((t) => ({
        taskId: t.id || "mock-1",
        title: t.title || "Example task",
        reason: "Oldest high priority item",
      })),
      summary: "Mock response — add API key for real analysis",
      toolCallLog: [],
    };
  }

  const taskSummary = taskList.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    createdAt: new Date(t.createdAt).toISOString(),
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
        content: `Here are the tasks:\n${JSON.stringify(taskSummary, null, 2)}\n\nRecommend the top 3.`,
      },
    ],
    executeTool: makeExecutor(taskList),
    onToolCall: opts.onToolCall,
  });

  const parsed = parseOutput(text, taskList);

  return {
    type: "prioritize",
    content: text,
    recommendations: parsed.recommendations,
    summary: parsed.summary,
    toolCallLog,
  };
}

export { runPrioritizationAgent as runPrioritizeAgent };
