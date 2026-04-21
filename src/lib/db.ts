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
    id          TEXT    PRIMARY KEY,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'todo',
    priority    TEXT    NOT NULL DEFAULT 'medium',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  )
`);

// ─── Internal Types ───────────────────────────────────────────────────────────

interface DbRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: number;
  updated_at: number;
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
  insert: db.prepare<[string, string, string, string, string, number, number], DbRow>(
    `INSERT INTO tasks (id, title, description, status, priority, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
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
    id:          row.id,
    title:       row.title,
    description: row.description,
    status:      row.status   as Task["status"],
    priority:    row.priority as Task["priority"],
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
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

  stmts.insert.run(
    id,
    input.title,
    input.description ?? "",
    input.status      ?? "todo",
    input.priority    ?? "medium",
    now,
    now
  );

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

export function deleteTask(id: string): void {
  const result = stmts.deleteById.run(id);
  if (result.changes === 0) throw new Error(`Task not found: ${id}`);
}

export { db };
