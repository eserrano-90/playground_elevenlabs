import { loadEnvConfig } from "@next/env";
import { getDb } from "./client";
import { runMigrations } from "./migrate-core";
import { seedDefaults } from "./seed-core";

loadEnvConfig(process.cwd());
const db = getDb();
runMigrations(db);
const count = seedDefaults(db);
console.log(`Seed complete. ${count} LLM options available.`);
