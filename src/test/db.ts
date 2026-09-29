import { createDb } from "@/db/client";
import { runMigrations } from "@/db/migrate-core";
import { seedDefaults } from "@/db/seed-core";

export function testDb() {
  const db = createDb(":memory:");
  runMigrations(db);
  seedDefaults(db);
  return db;
}
