import { loadEnvConfig } from "@next/env";
import { getDb } from "./client";
import { runMigrations } from "./migrate-core";

loadEnvConfig(process.cwd());
runMigrations(getDb());
console.log("Migrations applied.");
