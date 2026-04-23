import type { Database } from "better-sqlite3";

const PREFIX_RE = /^Parent:\s+([A-Za-z0-9_-]+)\n\n?/;

export function up(db: Database): void {
  const rows = db
    .prepare<[], { id: string; description: string; parent_task_id: string | null }>(
      `SELECT id, description, parent_task_id FROM tasks WHERE parent_task_id IS NULL AND description LIKE 'Parent: %'`
    )
    .all();

  if (rows.length === 0) return;

  const update = db.prepare(`UPDATE tasks SET parent_task_id = ?, description = ? WHERE id = ?`);
  const existsStmt = db.prepare<[string], { id: string }>(`SELECT id FROM tasks WHERE id = ?`);

  const backfill = db.transaction((items: typeof rows) => {
    for (const row of items) {
      const m = row.description.match(PREFIX_RE);
      if (!m || !m[1]) continue;
      const parentId: string = m[1];
      if (!existsStmt.get(parentId)) continue;
      const stripped = row.description.replace(PREFIX_RE, "");
      update.run(parentId, stripped, row.id);
    }
  });

  backfill(rows);
}
