# DevLog

AI-powered task tracker. Standard CRUD on SQLite plus four Claude agents that do real multi-turn tool calling — not single prompts, an actual loop.

The interesting parts are the agent architecture, not the task manager.

## What it does

- **Tasks** — create, edit, delete, filter by status/priority, list and board (kanban) views
- **Agent history** — runs are stored locally; reopen and reuse previous outputs
- **Four agents** — each with dedicated tools and a real tool-call loop:

| Agent | Tools | What it does |
|-------|-------|-------------|
| **Prioritize** | 3 | Scores every task (age × priority × blocked time), returns top 3 with reasoning |
| **Decompose** | 6 | Assesses clarity, asks a question if ambiguous, then creates/keeps/deletes subtasks |
| **Unblock** | 3 | Finds tasks stuck in-progress ≥3 days, generates root-cause questions + next actions |
| **Status** | 2 | Reads task + subtasks, writes a tone-matched Slack-style update |

All agents stream tool call events over SSE — you see the reasoning live as it runs.

## Getting started

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
# open http://localhost:3000
```

Without an API key the agents return deterministic mock responses — the full UI still works.

Node ≥20.9 required. If you see a `NODE_MODULE_VERSION` mismatch: `npm rebuild better-sqlite3`.

## Agent architecture

Every agent runs through the same generic loop (`src/lib/agents/loop.ts`):

```
LLM response → extract tool_use blocks → execute each server-side
             → feed tool_result back   → repeat until end_turn
```

Tools hit the same SQLite layer as the REST API. Tool implementations return data — the LLM does the reasoning. This is by design: unblock's `measure_description_complexity` returns raw character count, conjunction count, and sentence count with the instruction "YOU interpret these. No suggestions." The LLM decides what they mean.

Three design decisions worth noting:

**Early-stop predicate.** Decompose passes `shouldStop: (name) => name === "request_clarification"` to the loop. When Claude calls that tool, execution halts and the UI renders a clarification textarea. The answer is injected as a `user` message in the next run — interactive agent, no extra state machine.

**Subtask diffing.** Decompose has `keep_subtask` and `delete_subtask` tools alongside `create_subtask`. On re-runs the agent reads existing subtasks and decides what to keep, drop, or add — no duplicates, incremental improvement.

**Prompt injection hardening.** User content passes through `src/lib/agents/sanitize.ts`: role boundary tokens from six model families are stripped, all user data is wrapped in `<user_task_data>` delimiters, and system prompts explicitly tell Claude to treat that block as untrusted.

## Stack

- Next.js 16 (App Router), React 19, TypeScript strict
- SQLite via `better-sqlite3` — sync API, WAL mode, prepared statements
- Anthropic SDK — `claude-sonnet-4-6` by default, override via `ANTHROPIC_MODEL`
- Tailwind + Radix primitives, Zod validation

## Layout

```
src/lib/agents/
  loop.ts          # generic tool-call loop (~80 lines)
  prioritize.ts    # analyze_task_age · get_blocked_tasks · calculate_priority_score
  decompose.ts     # assess_clarity · request_clarification · keep_subtask · delete_subtask · create_subtask · finalize_decomposition
  unblock.ts       # identify_blocked_tasks · measure_description_complexity · record_unblock_report
  status.ts        # read_task_context · compose_update
  sanitize.ts      # strip role tokens, wrap untrusted input
  sse.ts           # server-side SSE writer
  sse-client.ts    # EventSource consumer (useAgent hook)
src/lib/db.ts      # SQLite CRUD with schema migrations
src/app/api/       # REST task CRUD + SSE agent routes
src/hooks/         # useTasks · useAgent · useCommandKey
```

## Tradeoffs

SQLite is single-user by design — right for a local dev tool. The agent loop caps at 12 iterations; most runs complete in 3–5. Non-SSE endpoints exist for parity but the UI always uses `/stream`.

## Development approach

Built with an AI coding agent for speed on boilerplate and scaffolding. Architecture decisions, agent design, UX, and bug fixes were done manually. The agent log (`AGENT_LOG.md`) has the full breakdown of what was delegated vs. what required direct intervention.
