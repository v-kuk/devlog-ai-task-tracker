import Anthropic from "@anthropic-ai/sdk";
import { createTask, deleteTask, getTaskById, getAllTasks } from "../src/lib/db";
import { runDecompositionAgent } from "../src/lib/agents/decompose";
import { runAgentLoop } from "../src/lib/agents/loop";

async function runRealAgent() {
  const parent = createTask({
    title: "Add user authentication with Google OAuth",
    description:
      "Implement sign-in using Google OAuth 2.0. Store users in the database, create sessions with secure cookies, and add a logout flow. Protect /dashboard routes.",
    status: "todo",
    priority: "high",
  });

  console.log("PARENT:", parent.id, "-", parent.title);
  const result = await runDecompositionAgent(parent);

  console.log("\n===== TOOL CALL LOG (real) =====");
  for (const [i, e] of (result.toolCallLog ?? []).entries()) {
    console.log(`\n[${i + 1}] ${e.tool}`);
    console.log("  input :", JSON.stringify(e.input));
    const out = e.output.length > 400 ? e.output.slice(0, 400) + "…" : e.output;
    console.log("  output:", out);
  }

  console.log("\n===== RESULT =====");
  console.log("type             :", result.type);
  console.log("mocked           :", result.mocked ?? false);

  if (result.type !== "decompose") {
    console.log("(unexpected agent type)");
    deleteTask(parent.id);
    return;
  }

  if (result.needsClarification) {
    console.log("needsClarification: true");
    console.log("question         :", result.question);
    deleteTask(parent.id);
    return;
  }

  console.log("summary          :", result.summary ?? "-");
  console.log("subtaskCount     :", result.subtasks.length);

  if (result.subtasks.length) {
    console.log("\n===== DB VERIFY =====");
    for (const st of result.subtasks) {
      const fresh = getTaskById(st.id);
      console.log(
        `  ${st.id} | priority=${st.priority} | persistedInDb=${!!fresh} | ${st.title}`
      );
    }
  }

  for (const st of result.subtasks) {
    try { deleteTask(st.id); } catch {}
  }
  deleteTask(parent.id);
  console.log("\ncleanup: deleted parent + subtasks");
}

// Simulates the Anthropic streaming tool-call flow so we can exercise the full
// agent loop — including create_subtask's DB write — without a real API key.
function buildFakeClient() {
  const scripted: Array<{
    content: Anthropic.ContentBlock[];
    stop_reason: Anthropic.Message["stop_reason"];
  }> = [
    {
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "t1",
          name: "assess_clarity",
          input: { title: "TEST", description: "TEST" },
        } as Anthropic.ToolUseBlock,
      ],
    },
    {
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "t2",
          name: "create_subtask",
          input: {
            title: "Set up Google OAuth credentials",
            description: "Create OAuth client in GCP console, store client id/secret.",
            priority: "high",
          },
        } as Anthropic.ToolUseBlock,
      ],
    },
    {
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "t3",
          name: "create_subtask",
          input: {
            title: "Wire up /api/auth/callback",
            description: "Exchange code for tokens, create session cookie.",
            priority: "medium",
          },
        } as Anthropic.ToolUseBlock,
      ],
    },
    {
      stop_reason: "tool_use",
      content: [
        {
          type: "tool_use",
          id: "t4",
          name: "finalize_decomposition",
          input: { summary: "Split into OAuth setup + callback wiring.", subtaskCount: 2 },
        } as Anthropic.ToolUseBlock,
      ],
    },
    {
      stop_reason: "end_turn",
      content: [
        { type: "text", text: "Decomposed task into 2 subtasks.", citations: null } as Anthropic.TextBlock,
      ],
    },
  ];
  let idx = 0;
  return {
    messages: {
      create: async () => scripted[idx++],
    },
  } as unknown as Anthropic;
}

async function runSimulated() {
  console.log("\n\n########## SIMULATED LOOP (no API key) ##########");
  const parent = createTask({
    title: "SIM parent — add OAuth login",
    description: "Add OAuth login for users.",
    status: "todo",
    priority: "high",
  });
  console.log("PARENT:", parent.id);

  const beforeCount = getAllTasks().length;
  const createdIds: string[] = [];

  const { toolCallLog, text } = await runAgentLoop({
    client: buildFakeClient(),
    model: "sim",
    maxTokens: 1024,
    system: "sim",
    tools: [],
    initialMessages: [{ role: "user", content: "decompose" }],
    executeTool: async (name, input) => {
      const args = (input ?? {}) as Record<string, unknown>;
      if (name === "assess_clarity") return { score: 8, issues: [] };
      if (name === "create_subtask") {
        const t = createTask({
          title: String(args.title),
          description: `Parent: ${parent.id}\n\n${String(args.description)}`,
          status: "todo",
          priority: args.priority as "low" | "medium" | "high",
        });
        createdIds.push(t.id);
        return t;
      }
      if (name === "finalize_decomposition")
        return { done: true, subtaskCount: createdIds.length };
      return {};
    },
  });

  console.log("\n===== TOOL CALL LOG (simulated) =====");
  for (const [i, e] of toolCallLog.entries()) {
    console.log(`\n[${i + 1}] ${e.tool}`);
    console.log("  input :", JSON.stringify(e.input));
    console.log(
      "  output:",
      e.output.length > 400 ? e.output.slice(0, 400) + "…" : e.output
    );
  }
  console.log("\nfinal text:", text);

  console.log("\n===== DB VERIFY =====");
  console.log("tasks before loop:", beforeCount);
  console.log("tasks after loop :", getAllTasks().length);
  for (const id of createdIds) {
    const row = getTaskById(id);
    console.log(`  ${id} | persistedInDb=${!!row} | title=${row?.title}`);
  }

  for (const id of createdIds) deleteTask(id);
  deleteTask(parent.id);
  console.log("\ncleanup: deleted parent + subtasks");
}

async function main() {
  const hasKey =
    !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_key_here";
  if (hasKey) {
    await runRealAgent();
  } else {
    console.log("ANTHROPIC_API_KEY unset → running simulated loop instead.\n");
  }
  await runSimulated();
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
