import type { Database } from "better-sqlite3";
import { up as migration001 } from "./001_add_parent_task_id";
import { up as migration002 } from "./002_backfill_parent_task_id_from_description";
import { up as migration003 } from "./003_add_sequence";

const migrations = [migration001, migration002, migration003];

export function runMigrations(db: Database): void {
  for (const up of migrations) {
    up(db);
  }
}
