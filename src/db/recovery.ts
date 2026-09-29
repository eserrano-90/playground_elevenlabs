import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { runMigrations } from "./migrate-core";
import { seedDefaults } from "./seed-core";
import { runs } from "./schema";

/**
 * Boot-time housekeeping: apply migrations, ensure defaults, and fail runs left in
 * `running` by a previous process (the in-process queue does not survive restarts).
 */
export function recoverStaleRuns() {
  const db = getDb();
  runMigrations(db);
  seedDefaults(db);
  const res = db
    .update(runs)
    .set({ status: "failed", error: "Interrupted by server restart", finishedAt: new Date() })
    .where(eq(runs.status, "running"))
    .run();
  if (res.changes > 0) console.warn(`[bench] Marked ${res.changes} stale running run(s) as failed.`);
}
