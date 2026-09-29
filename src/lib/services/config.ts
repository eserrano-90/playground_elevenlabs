import { desc, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { scenarios, variants } from "@/db/schema";
import type { ScenarioInput, VariantInput } from "@/lib/validation";

export function listVariants(db: DB) {
  return db.select().from(variants).orderBy(desc(variants.createdAt), desc(variants.id)).all();
}

export function getVariant(db: DB, id: number) {
  return db.select().from(variants).where(eq(variants.id, id)).get() ?? null;
}

export function createVariant(db: DB, input: VariantInput) {
  return db.insert(variants).values(input).returning().get();
}

export function updateVariant(db: DB, id: number, input: VariantInput) {
  return db.update(variants).set({ ...input, updatedAt: new Date() }).where(eq(variants.id, id)).returning().get() ?? null;
}

export function duplicateVariant(db: DB, id: number) {
  const v = getVariant(db, id);
  if (!v) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = v;
  return db.insert(variants).values({ ...rest, name: `${v.name} (copy)`.slice(0, 60) }).returning().get();
}

export function deleteVariant(db: DB, id: number) {
  return db.delete(variants).where(eq(variants.id, id)).run().changes > 0;
}

export function listScenarios(db: DB) {
  return db.select().from(scenarios).orderBy(desc(scenarios.createdAt), desc(scenarios.id)).all();
}

export function getScenario(db: DB, id: number) {
  return db.select().from(scenarios).where(eq(scenarios.id, id)).get() ?? null;
}

function scenarioRow(input: ScenarioInput) {
  return {
    ...input,
    personaPrompt: input.userMode === "persona" ? (input.personaPrompt ?? null) : null,
    scriptedTurns: input.userMode === "scripted" ? (input.scriptedTurns ?? []) : null,
  };
}

export function createScenario(db: DB, input: ScenarioInput) {
  return db.insert(scenarios).values(scenarioRow(input)).returning().get();
}

export function updateScenario(db: DB, id: number, input: ScenarioInput) {
  return (
    db
      .update(scenarios)
      .set({ ...scenarioRow(input), updatedAt: new Date() })
      .where(eq(scenarios.id, id))
      .returning()
      .get() ?? null
  );
}

export function deleteScenario(db: DB, id: number) {
  return db.delete(scenarios).where(eq(scenarios.id, id)).run().changes > 0;
}
