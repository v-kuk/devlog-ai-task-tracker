import type { Database } from "better-sqlite3";

export function up(db: Database): void {
  const rows = db.prepare(`PRAGMA table_info(tasks)`).all() as { name: string }[];
  if (rows.some((r) => r.name === "parent_task_id")) return;

  db.exec(`ALTER TABLE tasks ADD COLUMN parent_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL`);
}
