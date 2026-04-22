import Database from "better-sqlite3";
import path from "path";
import { nanoid } from "nanoid";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/types";

// ─── Database Setup ───────────────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), "devlog.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema Initialization ────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id             TEXT    PRIMARY KEY,
    title          TEXT    NOT NULL,
    description    TEXT    NOT NULL DEFAULT '',
    status         TEXT    NOT NULL DEFAULT 'todo',
    priority       TEXT    NOT NULL DEFAULT 'medium',
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL,
    parent_task_id TEXT    REFERENCES tasks(id) ON DELETE SET NULL
  )
`);

// ─── Migrations ───────────────────────────────────────────────────────────────

function columnExists(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

if (!columnExists("tasks", "parent_task_id")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN parent_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL`);
}

// Backfill parent_task_id from legacy "Parent: <id>\n\n" description prefix
{
  const PREFIX_RE = /^Parent:\s+([A-Za-z0-9_-]+)\n\n?/;
  const rows = db
    .prepare<[], { id: string; description: string; parent_task_id: string | null }>(
      `SELECT id, description, parent_task_id FROM tasks WHERE parent_task_id IS NULL AND description LIKE 'Parent: %'`
    )
    .all();
  const update = db.prepare(`UPDATE tasks SET parent_task_id = ?, description = ? WHERE id = ?`);
  const backfill = db.transaction((items: typeof rows) => {
    for (const row of items) {
      const m = row.description.match(PREFIX_RE);
      if (!m || !m[1]) continue;
      const parentId: string = m[1];
      const existsStmt = db.prepare<[string], { id: string }>(`SELECT id FROM tasks WHERE id = ?`);
      if (!existsStmt.get(parentId)) continue;
      const stripped = row.description.replace(PREFIX_RE, "");
      update.run(parentId, stripped, row.id);
    }
  });
  if (rows.length > 0) backfill(rows);
}

if (!columnExists("tasks", "sequence")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN sequence INTEGER`);
  const rows = db.prepare<[], { id: string }>(
    `SELECT id FROM tasks ORDER BY created_at ASC, id ASC`
  ).all();
  const stmt = db.prepare(`UPDATE tasks SET sequence = ? WHERE id = ?`);
  const tx = db.transaction((items: { id: string }[]) => {
    items.forEach((r, i) => stmt.run(i + 1, r.id));
  });
  if (rows.length > 0) tx(rows);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_sequence ON tasks(sequence)`);
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface DbRow {
  id: string;
  sequence: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: number;
  updated_at: number;
  parent_task_id: string | null;
}

export interface GetAllTasksFilters {
  status?: string;
  sortBy?: "priority" | "createdAt";
}

// ─── Prepared Statements ──────────────────────────────────────────────────────

const stmts = {
  getById: db.prepare<[string], DbRow>(
    `SELECT * FROM tasks WHERE id = ?`
  ),
  insert: db.prepare<[string, string, string, string, string, number, number, string | null, number], DbRow>(
    `INSERT INTO tasks (id, title, description, status, priority, created_at, updated_at, parent_task_id, sequence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  deleteById: db.prepare<[string], DbRow>(
    `DELETE FROM tasks WHERE id = ?`
  ),
};

// ─── Sort clause helper ───────────────────────────────────────────────────────

const PRIORITY_SORT = `CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ASC`;
const CREATED_SORT  = `created_at DESC`;

function orderClause(sortBy?: "priority" | "createdAt"): string {
  return sortBy === "createdAt"
    ? CREATED_SORT
    : `${PRIORITY_SORT}, ${CREATED_SORT}`;
}

// ─── Row → Task Mapper ────────────────────────────────────────────────────────

function rowToTask(row: DbRow): Task {
  return {
    id:           row.id,
    sequence:     row.sequence,
    title:        row.title,
    description:  row.description,
    status:       row.status   as Task["status"],
    priority:     row.priority as Task["priority"],
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
    parentTaskId: row.parent_task_id ?? null,
  };
}

// ─── Exported Functions ───────────────────────────────────────────────────────

export function getAllTasks(filters?: GetAllTasksFilters): Task[] {
  const order = orderClause(filters?.sortBy);

  if (filters?.status) {
    return db
      .prepare<[string], DbRow>(`SELECT * FROM tasks WHERE status = ? ORDER BY ${order}`)
      .all(filters.status)
      .map(rowToTask);
  }

  return db
    .prepare<[], DbRow>(`SELECT * FROM tasks ORDER BY ${order}`)
    .all()
    .map(rowToTask);
}

export function getTaskById(id: string): Task | null {
  const row = stmts.getById.get(id);
  return row ? rowToTask(row) : null;
}

export function createTask(input: CreateTaskInput): Task {
  const id  = nanoid();
  const now = Date.now();

  const create = db.transaction(() => {
    const maxRow = db.prepare<[], { max_seq: number | null }>(
      `SELECT MAX(sequence) AS max_seq FROM tasks`
    ).get();
    const sequence = (maxRow?.max_seq ?? 0) + 1;

    stmts.insert.run(
      id,
      input.title,
      input.description ?? "",
      input.status      ?? "todo",
      input.priority    ?? "medium",
      now,
      now,
      input.parentTaskId ?? null,
      sequence
    );
  });

  create();

  const row = stmts.getById.get(id);
  if (!row) throw new Error(`Failed to retrieve created task: ${id}`);
  return rowToTask(row);
}

export function updateTask(id: string, input: UpdateTaskInput): Task {
  const existing = stmts.getById.get(id);
  if (!existing) throw new Error(`Task not found: ${id}`);

  const fields: string[]           = [];
  const params: (string | number)[] = [];

  if (input.title       !== undefined) { fields.push("title = ?");       params.push(input.title); }
  if (input.description !== undefined) { fields.push("description = ?"); params.push(input.description); }
  if (input.status      !== undefined) { fields.push("status = ?");      params.push(input.status); }
  if (input.priority    !== undefined) { fields.push("priority = ?");    params.push(input.priority); }

  if (fields.length === 0) return rowToTask(existing);

  const now = Date.now();
  fields.push("updated_at = ?");
  params.push(now, id);

  db.prepare<(string | number)[]>(
    `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`
  ).run(...params);

  const updated = stmts.getById.get(id);
  if (!updated) throw new Error(`Failed to retrieve updated task: ${id}`);
  return rowToTask(updated);
}

export function getSubtasks(parentId: string): Task[] {
  return db
    .prepare<[string], DbRow>(`SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY created_at ASC`)
    .all(parentId)
    .map(rowToTask);
}

export function deleteTask(id: string): void {
  const result = stmts.deleteById.run(id);
  if (result.changes === 0) throw new Error(`Task not found: ${id}`);
}

export { db };
