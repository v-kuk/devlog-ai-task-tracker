# AGENT_LOG

## TL;DR

Built a task tracker with real multi-step AI agents (prioritize, decompose, unblock + status updates).

Used a coding agent to speed up development, but all key decisions — architecture, UX, agent behavior — were mine.

Most things worked smoothly, but I had to step in regularly for UX, edge cases, and correctness.

Total time: ~9–10 hours.

---

## How I actually worked

Process was simple and iterative:

- first I decided what to build
- discussed implementation options with the agent
- chose direction
- let agent scaffold things
- tested everything manually
- fixed issues (sometimes via agent, sometimes myself)
- improved UX based on real usage
- repeated

I didn’t treat the agent as “build it for me”, more like:
> fast pair-programmer that still needs supervision

---

## What the agent helped with

- project setup (Next.js, basic structure)
- CRUD API + SQLite
- base UI components
- initial versions of agents
- wiring things together quickly

It saved a lot of time on boilerplate and repetitive work.

---

## Where I took control

### UX and product decisions

Almost all UX decisions are mine.

I reworked a lot of what the agent generated:
- filtering
- task list behavior
- board (kanban-style) view
- interaction patterns

Agent tends to produce something “working”, but not something you’d actually want to use.

---

### Agent design

Biggest focus area.

What I did here:
- designed proper tool-based agent loop (not just prompt → response)
- reworked decomposition logic to:
  - consider existing subtasks (not duplicate them)
  - improve instead of recreating
- added agent run history so results are not lost and can be revisited

This improved UX a lot — especially compared to “run agent → output disappears”.

---

### Fixing issues

Most things worked, but still had to step in.

Main issue:
- React crashes during early decompose runs (render loops / state issues)

Fix:
- stabilized state updates
- made agent panel behavior more predictable

Also had smaller issues:
- API inconsistencies
- DB query bugs (e.g. ambiguous columns)
- some broken edge cases from generated code

---

## What went well

- Fast iteration — agent helped move quickly
- Clear separation: agent generates, I validate
- Agent loop works properly (multi-step, tool-based)
- Decomposition flow feels practical (not just demo)

---

## What I intentionally didn’t focus on

To stay within time:

- no drag & drop
- no advanced task manager features
- limited UI polish
- not all edge cases covered

Priority was:
> build real agentic features, not a perfect task manager

---

## Key decisions

- SQLite — simple, persistent, enough for scope
- Tool-based agents instead of single prompts
- Reuse existing subtasks instead of duplicating
- Store agent history for better UX
- Mock mode without API key

---

## Final note

The agent made development faster, but not easier by default.

Most value came from:
- deciding what to build
- correcting what the agent got wrong
- shaping the UX and agent behavior

Agent helped with speed. 
Quality still came from manual decisions.
