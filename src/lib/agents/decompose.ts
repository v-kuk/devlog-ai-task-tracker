import type Anthropic from "@anthropic-ai/sdk";
import type { AgentResult, Task, TaskPriority } from "@/types";
import { createTask, getTaskById } from "@/lib/db";
import { runAgentLoop, getAnthropicClient, AGENT_MODEL } from "./loop";

const tools: Anthropic.Tool[] = [
  {
    name: "assess_clarity",
    description:
      "Scores how clearly a task is described on 1-10. Returns { score, issues[] }. Low score means ambiguous.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "request_clarification",
    description:
      "Ask the user ONE specific question. Only call when assess_clarity score < 7. Stops the agent.",
    input_schema: {
      type: "object",
      properties: { question: { type: "string" } },
      required: ["question"],
    },
  },
  {
    name: "create_subtask",
    description:
      "Creates a subtask in the database under the parent task. Use short actionable titles.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["title", "description", "priority"],
    },
  },
  {
    name: "finalize_decomposition",
    description:
      "Call last to signal completion. Summarize the decomposition in 1-2 sentences.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        subtaskCount: { type: "number" },
      },
      required: ["summary", "subtaskCount"],
    },
  },
];

const SYSTEM = `You are a senior engineer breaking down tasks.
STRICT FLOW:
1. ALWAYS call assess_clarity first
2. If score < 7: call request_clarification with ONE specific question, then STOP
3. If score >= 7: call create_subtask for each subtask (max 7)
4. ALWAYS call finalize_decomposition last
Each subtask must be actionable and completable in under 2 hours.`;

interface DecomposeState {
  parentId: string;
  createdSubtasks: Task[];
  question?: string;
  needsClarification: boolean;
  summary?: string;
  issues: string[];
}

function scoreClarity(title: string, description: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 10;
  const text = `${title} ${description}`.toLowerCase();
  if ((description ?? "").trim().length < 20) {
    score -= 3;
    issues.push("description is very short");
  }
  if (!/\b(implement|add|fix|refactor|create|build|write|update|remove|migrate)\b/.test(text)) {
    score -= 2;
    issues.push("no clear action verb");
  }
  if (/\b(something|stuff|things|etc|improve|better|nicer)\b/.test(text)) {
    score -= 2;
    issues.push("vague wording");
  }
  if (title.trim().length < 8) {
    score -= 2;
    issues.push("title too short");
  }
  return { score: Math.max(1, Math.min(10, score)), issues };
}

function makeExecutor(state: DecomposeState) {
  return async (name: string, input: unknown) => {
    const args = (input ?? {}) as Record<string, unknown>;

    if (name === "assess_clarity") {
      const result = scoreClarity(String(args.title ?? ""), String(args.description ?? ""));
      state.issues = result.issues;
      return result;
    }

    if (name === "request_clarification") {
      state.needsClarification = true;
      state.question = String(args.question ?? "");
      return { question: state.question };
    }

    if (name === "create_subtask") {
      const title = String(args.title ?? "").slice(0, 250);
      const description = String(args.description ?? "");
      const priority = (["low", "medium", "high"].includes(String(args.priority))
        ? args.priority
        : "medium") as TaskPriority;

      const created = createTask({
        title,
        description: description.slice(0, 5000),
        status: "todo",
        priority,
        parentTaskId: state.parentId,
      });
      state.createdSubtasks.push(created);
      return created;
    }

    if (name === "finalize_decomposition") {
      state.summary = String(args.summary ?? "");
      return { done: true, subtaskCount: state.createdSubtasks.length };
    }

    return { error: `Unknown tool: ${name}` };
  };
}

export async function runDecompositionAgent(
  task: Task,
  clarificationAnswer?: string
): Promise<AgentResult> {
  const client = getAnthropicClient();

  if (!client) {
    return {
      type: "decompose",
      needsClarification: false,
      content: "",
      mocked: true,
      notice: "Set ANTHROPIC_API_KEY to enable real AI",
      subtasks: [],
      summary: "Mock response — add API key",
      toolCallLog: [],
    };
  }

  const state: DecomposeState = {
    parentId: task.id,
    createdSubtasks: [],
    needsClarification: false,
    issues: [],
  };

  const userContent = clarificationAnswer
    ? `Parent task:\n${JSON.stringify(task, null, 2)}\n\nPrevious clarification answer from user: ${clarificationAnswer}\n\nDecompose now.`
    : `Parent task:\n${JSON.stringify(task, null, 2)}\n\nDecompose this task.`;

  const { text, toolCallLog } = await runAgentLoop({
    client,
    model: AGENT_MODEL,
    maxTokens: 2048,
    system: SYSTEM,
    tools,
    initialMessages: [{ role: "user", content: userContent }],
    executeTool: makeExecutor(state),
    shouldStop: (name) => name === "request_clarification",
  });

  if (state.needsClarification) {
    return {
      type: "decompose",
      needsClarification: true,
      content: text,
      question: state.question ?? "Please clarify this task.",
      toolCallLog,
    };
  }

  return {
    type: "decompose",
    needsClarification: false,
    content: text,
    subtasks: state.createdSubtasks,
    summary: state.summary ?? text,
    toolCallLog,
  };
}

export async function runDecomposeAgent(
  taskId: string,
  clarificationAnswer?: string
): Promise<AgentResult> {
  const task = getTaskById(taskId);
  if (!task) {
    return {
      type: "decompose",
      needsClarification: false,
      content: "",
      subtasks: [],
      notice: `Task ${taskId} not found`,
      toolCallLog: [],
    };
  }
  return runDecompositionAgent(task, clarificationAnswer);
}
