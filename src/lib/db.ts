import Database from "better-sqlite3";
import path from "path";
import { nanoid } from "nanoid";
import type { Task, TaskFilters, CreateTaskInput, UpdateTaskInput } from "@/types";

// ─── Database Setup ───────────────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), "devlog.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
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

// ─── Prepared Statements ──────────────────────────────────────────────────────

const stmts = {
  getAll: db.prepare<[], DbRow>(`
    SELECT * FROM tasks
    ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ASC,
      created_at DESC
  `),

  getAllByStatus: db.prepare<[string], DbRow>(`
    SELECT * FROM tasks
    WHERE status = ?
    ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ASC,
      created_at DESC
  `),

  getAllByPriority: db.prepare<[string], DbRow>(`
    SELECT * FROM tasks
    WHERE priority = ?
    ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ASC,
      created_at DESC
  `),

  getAllByStatusAndPriority: db.prepare<[string, string], DbRow>(`
    SELECT * FROM tasks
    WHERE status = ? AND priority = ?
    ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ASC,
      created_at DESC
  `),

  getById: db.prepare<[string], DbRow>(`
    SELECT * FROM tasks WHERE id = ?
  `),

  insert: db.prepare<[string, string, string, string, string, number, number], DbRow>(`
    INSERT INTO tasks (id, title, description, status, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  deleteById: db.prepare<[string], DbRow>(`
    DELETE FROM tasks WHERE id = ?
  `),
};

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

// ─── Row → Task Mapper ────────────────────────────────────────────────────────

function rowToTask(row: DbRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Search helper (not a prepared stmt — dynamic LIKE query) ─────────────────

function buildSearchQuery(filters: TaskFilters): Task[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters.priority) {
    conditions.push("priority = ?");
    params.push(filters.priority);
  }
  if (filters.search) {
    conditions.push("(title LIKE ? OR description LIKE ?)");
    const term = `%${filters.search}%`;
    params.push(term, term);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT * FROM tasks
    ${where}
    ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ASC,
      created_at DESC
  `;

  const rows = db.prepare<(string | number)[], DbRow>(sql).all(...params);
  return rows.map(rowToTask);
}

// ─── Exported Functions ───────────────────────────────────────────────────────

export function getAllTasks(filters?: TaskFilters): Task[] {
  if (filters && Object.values(filters).some(Boolean)) {
    return buildSearchQuery(filters);
  }
  return stmts.getAll.all().map(rowToTask);
}

export function getTaskById(id: string): Task | undefined {
  const row = stmts.getById.get(id);
  return row ? rowToTask(row) : undefined;
}

export function createTask(input: CreateTaskInput): Task {
  const id = nanoid();
  const now = Date.now();

  stmts.insert.run(
    id,
    input.title,
    input.description ?? "",
    input.status ?? "todo",
    input.priority ?? "medium",
    now,
    now
  );

  const row = stmts.getById.get(id);
  if (!row) throw new Error(`Failed to retrieve created task: ${id}`);
  return rowToTask(row);
}

export function updateTask(id: string, input: UpdateTaskInput): Task | undefined {
  const existing = stmts.getById.get(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const params: (string | number)[] = [];

  if (input.title !== undefined) {
    fields.push("title = ?");
    params.push(input.title);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    params.push(input.description);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    params.push(input.status);
  }
  if (input.priority !== undefined) {
    fields.push("priority = ?");
    params.push(input.priority);
  }

  if (fields.length === 0) return rowToTask(existing);

  const now = Date.now();
  fields.push("updated_at = ?");
  params.push(now, id);

  db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  const updated = stmts.getById.get(id);
  return updated ? rowToTask(updated) : undefined;
}

export function deleteTask(id: string): boolean {
  const result = stmts.deleteById.run(id);
  return result.changes > 0;
}

export { db };
