import type { Database } from "better-sqlite3";

export function up(db: Database): void {
  const rows = db.prepare(`PRAGMA table_info(tasks)`).all() as { name: string }[];
  if (rows.some((r) => r.name === "sequence")) return;

  db.exec(`ALTER TABLE tasks ADD COLUMN sequence INTEGER`);

  const tasks = db.prepare<[], { id: string }>(`SELECT id FROM tasks ORDER BY created_at ASC, id ASC`).all();
  const stmt = db.prepare(`UPDATE tasks SET sequence = ? WHERE id = ?`);
  const tx = db.transaction((items: { id: string }[]) => {
    items.forEach((r, i) => stmt.run(i + 1, r.id));
  });
  if (tasks.length > 0) tx(tasks);

  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_sequence ON tasks(sequence)`);
}
