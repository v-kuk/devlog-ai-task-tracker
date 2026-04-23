import Database from "better-sqlite3";
import path from "path";
import { nanoid } from "nanoid";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/types";
import { runMigrations } from "./migrations";

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

runMigrations(db);

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
  sortOrder?: "asc" | "desc";
  taskType?: "all" | "parents" | "subtasks";
  parentId?: string;
}

export interface TaskWithMeta extends Task {
  subtaskCount: number;
  parentTitle: string | null;
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

const PRIORITY_CASE       = `CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`;
const PRIORITY_CASE_ALIAS = `CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`;

function orderClause(sortBy?: "priority" | "createdAt", sortOrder?: "asc" | "desc", alias = false): string {
  if (sortBy === "createdAt") {
    const dir = (sortOrder ?? "desc").toUpperCase();
    return `created_at ${dir}`;
  }
  const caseExpr = alias ? PRIORITY_CASE_ALIAS : PRIORITY_CASE;
  const dir = (sortOrder ?? "asc").toUpperCase();
  return `${caseExpr} ${dir}, created_at DESC`;
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
  const order = orderClause(filters?.sortBy, filters?.sortOrder);

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

interface DbRowWithMeta extends DbRow {
  subtask_count: number;
  parent_title: string | null;
}

function rowToTaskWithMeta(row: DbRowWithMeta): TaskWithMeta {
  return {
    ...rowToTask(row),
    subtaskCount: row.subtask_count,
    parentTitle: row.parent_title ?? null,
  };
}

export function getAllTasksWithMeta(filters?: GetAllTasksFilters): TaskWithMeta[] {
  const order = orderClause(filters?.sortBy, filters?.sortOrder, true);
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.status) {
    conditions.push("t.status = ?");
    params.push(filters.status);
  }
  if (filters?.parentId) {
    conditions.push("t.parent_task_id = ?");
    params.push(filters.parentId);
  } else if (filters?.taskType === "parents") {
    conditions.push("t.parent_task_id IS NULL");
  } else if (filters?.taskType === "subtasks") {
    conditions.push("t.parent_task_id IS NOT NULL");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return (db.prepare(
    `SELECT t.*,
       (SELECT COUNT(*) FROM tasks c WHERE c.parent_task_id = t.id) AS subtask_count,
       p.title AS parent_title
     FROM tasks t
     LEFT JOIN tasks p ON p.id = t.parent_task_id
     ${where}
     ORDER BY ${order}`
  ).all(...params) as DbRowWithMeta[]).map(rowToTaskWithMeta);
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
