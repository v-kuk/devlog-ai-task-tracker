# DevLog

AI-powered developer task tracker. Plain CRUD on top of SQLite, plus three Claude-driven agents that analyze your backlog with real multi-turn tool calling.

## What it does

- **Tasks** — create, edit, delete, filter by status, sort by priority or recency
- **Prioritize agent** — reviews your whole task list and recommends top 3 to work on today (considers age, priority, stuck time)
- **Decompose agent** — breaks a task into subtasks. If the task is ambiguous, the agent asks a clarifying question before decomposing
- **Unblock agent** — finds in-progress tasks stuck ≥3 days and generates root-cause questions + concrete next actions

Each agent runs a real tool-call loop with Claude (`claude-sonnet-4-6` by default). Without an API key it falls back to deterministic mock responses so the UI stays usable.

## Stack

- **Next.js 16** App Router + Turbopack, React 19
- **SQLite** via `better-sqlite3` (`devlog.db` in repo root)
- **Anthropic SDK** (`@anthropic-ai/sdk`) for agent tool-calling
- **Tailwind** + shadcn-style components (Radix primitives)
- **Zod** for schema validation
- TypeScript strict

## Getting started

```bash
# 1. Install
npm install

# 2. Add Anthropic key (optional — without it agents return mock responses)
cp .env.example .env.local
# edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Run
npm run dev
# open http://localhost:3000
```

Required: Node **≥20.9.0** (better-sqlite3 + Next 16). If you see a `NODE_MODULE_VERSION` mismatch, run `npm rebuild better-sqlite3`.

## Project layout

```
src/
├── app/
│   ├── layout.tsx               # Root — dark/light aware shell
│   ├── page.tsx                 # Home — task list, filters, agent triggers, Cmd+K
│   ├── tasks/new/               # Create page
│   ├── tasks/[id]/edit/         # Edit page + per-task agent triggers
│   └── api/
│       ├── tasks/               # GET/POST/PATCH/DELETE task CRUD
│       └── agents/              # POST + SSE streaming routes (prioritize | decompose | unblock)
├── components/
│   ├── ErrorBoundary.tsx        # Wraps AgentPanel
│   ├── agents/AgentPanel.tsx    # Sheet-based agent UI (3 modes)
│   ├── tasks/                   # TaskCard, TaskList, TaskForm, TaskFilters
│   └── ui/                      # shadcn primitives (button, sheet, ...)
├── hooks/
│   ├── useTasks.ts              # Fetch + mutate tasks
│   ├── useAgent.ts              # Fire agent endpoints + clarification flow
│   └── useCommandKey.ts         # Cmd/Ctrl+K shortcut hook
├── lib/
│   ├── db.ts                    # SQLite CRUD with prepared statements
│   ├── utils.ts                 # cn() helper
│   └── agents/
│       ├── loop.ts              # Generic Claude tool-call loop
│       ├── prioritize.ts        # 3 tools: age, blocked list, priority score
│       ├── decompose.ts         # 4 tools: assess, clarify, create, finalize
│       └── unblock.ts           # 3 tools: identify, complexity, plan
└── types/                       # Zod schemas + TS types
scripts/
└── test-decompose.ts            # Tool-call-log smoke test
```

## Agent architecture

Every agent uses the same core loop (`src/lib/agents/loop.ts`):

1. Send messages + tool definitions to Claude.
2. If response contains `tool_use` blocks: execute each tool server-side, feed results back as `tool_result`.
3. Repeat until `stop_reason === "end_turn"` (or an early-stop predicate fires — decompose uses this for `request_clarification`).
4. Return `{ text, toolCallLog }` — the full log is exposed in the UI under "Agent reasoning".

Tool implementations are pure TypeScript and hit the same SQLite layer the REST API uses. `create_subtask` (decompose) writes real rows via `lib/db.ts#createTask`, setting `parent_task_id` on the row — no more `"Parent: <id>"` prefix in the description. The schema backfills the column on startup for any legacy rows.

## UI flow

- **Home** — sticky header with `DevLog` logo, Prioritize + Scan-for-blockers buttons, task count. Sparkles icon on each card opens Decompose in a right-side Sheet.
- **Cmd/Ctrl+K** — jump to new-task page from anywhere on home (ignored while typing in inputs).
- **AgentPanel** — single Sheet component, three modes:
  - *prioritize* — numbered recs with Jump-to-task (scrolls + flash-highlights card)
  - *decompose* — clarification textarea *or* subtask checklist with priority badges
  - *unblock* — cards per stuck task with severity badge, questions, next actions
- **Error boundary** around the panel — catches render errors, shows reset button
- **Dark/light** — follows `prefers-color-scheme`; add `class="dark"` / `class="light"` on `<html>` to force

## API endpoints

| Method | Path                     | Body                               | Returns                 |
| ------ | ------------------------ | ---------------------------------- | ----------------------- |
| GET    | `/api/tasks`             | query: `status`, `sortBy`          | `{ tasks: Task[] }`     |
| POST   | `/api/tasks`             | `CreateTaskInput`                  | `{ task: Task }`        |
| GET    | `/api/tasks/[id]`        | —                                  | `{ task: Task }` or 404 |
| PATCH  | `/api/tasks/[id]`        | `UpdateTaskInput`                  | `{ task: Task }`        |
| DELETE | `/api/tasks/[id]`        | —                                  | 204                     |
| POST   | `/api/agents/prioritize`        | —                                  | `AgentResult`           |
| POST   | `/api/agents/decompose`         | `{ taskId, clarificationAnswer? }` | `AgentResult`           |
| POST   | `/api/agents/unblock`           | —                                  | `AgentResult`           |
| POST   | `/api/agents/prioritize/stream` | same as above                      | SSE stream              |
| POST   | `/api/agents/decompose/stream`  | same as above                      | SSE stream              |
| POST   | `/api/agents/unblock/stream`    | same as above                      | SSE stream              |

All agent routes return a mock `AgentResult` when `ANTHROPIC_API_KEY` is unset.

### SSE event shape

Each `/stream` endpoint is a `text/event-stream` response. The client (`useAgent` hook) consumes it via `consumeSse` in `src/lib/agents/sse-client.ts`.

| Event        | Payload                     | When                                      |
| ------------ | --------------------------- | ----------------------------------------- |
| `tool_call`  | `ToolCallLog` object        | After each tool executes (zero or more)   |
| `done`       | `AgentResult` object        | Agent finished (success or mock)          |
| `error`      | `{ message: string }`       | Unhandled exception or missing `taskId`   |

The UI renders live `tool_call` entries in the loading state ("Agent is thinking…") so the user sees progress without polling.

## Security

`docs/PROMPT_INJECTION.md` documents how the agents are hardened against prompt-injection attacks embedded in task titles/descriptions.

## Smoke test

```bash
npx tsx scripts/test-decompose.ts
```

Runs the decompose loop against a fabricated parent task, prints every tool call with input/output, and verifies `create_subtask` persists rows to SQLite. Falls back to a scripted fake Anthropic client when the API key is missing, so you can validate the loop offline.

## Scripts

```bash
npm run dev      # Turbopack dev on :3000
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Next lint (needs Node ≥20)
```
