import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __benchDb?: DB };

export function createDb(file: string): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

/** Process-wide DB handle; survives Next.js dev hot reloads. */
export function getDb(): DB {
  if (!globalForDb.__benchDb) {
    globalForDb.__benchDb = createDb(process.env.DATABASE_PATH ?? "./data/bench.db");
  }
  return globalForDb.__benchDb;
}
