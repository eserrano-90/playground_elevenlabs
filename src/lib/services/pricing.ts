import { eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { llmOptions, pricingSettings, type LlmOption, type PricingSettings } from "@/db/schema";
import { seedDefaults } from "@/db/seed-core";

export function getPricing(db: DB): PricingSettings {
  let row = db.select().from(pricingSettings).where(eq(pricingSettings.id, 1)).get();
  if (!row) {
    seedDefaults(db);
    row = db.select().from(pricingSettings).where(eq(pricingSettings.id, 1)).get()!;
  }
  return row;
}

export function listLlmOptions(db: DB): LlmOption[] {
  return db.select().from(llmOptions).orderBy(llmOptions.provider, llmOptions.id).all();
}

export function getLlmPrice(db: DB, llm: string): LlmOption | null {
  return db.select().from(llmOptions).where(eq(llmOptions.id, llm)).get() ?? null;
}

export function updatePricing(
  db: DB,
  input: Pick<PricingSettings, "usdPerCredit" | "plan" | "agentUsdPerMinuteByPlan" | "speechRateByTtsModel">,
) {
  getPricing(db);
  return db
    .update(pricingSettings)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(pricingSettings.id, 1))
    .returning()
    .get();
}

export function upsertLlmOption(db: DB, input: Omit<LlmOption, "updatedAt">) {
  const row = { ...input, updatedAt: new Date() };
  return db.insert(llmOptions).values(row).onConflictDoUpdate({ target: llmOptions.id, set: row }).returning().get();
}

export function deleteLlmOption(db: DB, id: string) {
  return db.delete(llmOptions).where(eq(llmOptions.id, id)).run().changes > 0;
}
