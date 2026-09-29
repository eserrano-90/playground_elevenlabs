import { sql } from "drizzle-orm";
import type { DB } from "./client";
import { llmOptions, pricingSettings } from "./schema";
import seed from "./pricing.seed.json";

/** Inserts default pricing and LLM options. Existing rows are left untouched (user edits win). */
export function seedDefaults(db: DB) {
  db.insert(pricingSettings)
    .values({
      id: 1,
      usdPerCredit: seed.usdPerCredit,
      plan: seed.plan,
      agentUsdPerMinuteByPlan: seed.agentUsdPerMinuteByPlan,
      speechRateByTtsModel: seed.speechRateByTtsModel,
      updatedAt: new Date(seed.updatedAt),
    })
    .onConflictDoNothing()
    .run();

  // Add speech rates for newly seeded TTS models without overwriting edited ones.
  const current = db.select().from(pricingSettings).get();
  if (current) {
    const merged = { ...seed.speechRateByTtsModel, ...current.speechRateByTtsModel };
    if (Object.keys(merged).length !== Object.keys(current.speechRateByTtsModel).length) {
      db.update(pricingSettings).set({ speechRateByTtsModel: merged }).run();
    }
  }

  for (const l of seed.llms) {
    db.insert(llmOptions)
      .values({
        id: l.id,
        label: l.label,
        provider: l.provider,
        inputUsdPerMTok: l.input,
        outputUsdPerMTok: l.output,
        updatedAt: new Date(seed.updatedAt),
      })
      .onConflictDoNothing()
      .run();
  }
  return db.select({ n: sql<number>`count(*)` }).from(llmOptions).get()?.n ?? 0;
}
