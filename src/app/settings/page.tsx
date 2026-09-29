import { getDb } from "@/db/client";
import { getPricing, listLlmOptions } from "@/lib/services/pricing";
import { SettingsView } from "./settings-view";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const db = getDb();
  const pricing = getPricing(db);
  return (
    <SettingsView
      pricing={{
        usdPerCredit: pricing.usdPerCredit,
        plan: pricing.plan,
        agentUsdPerMinuteByPlan: pricing.agentUsdPerMinuteByPlan,
        speechRateByTtsModel: pricing.speechRateByTtsModel,
        updatedAt: pricing.updatedAt?.toISOString() ?? null,
      }}
      llms={listLlmOptions(db).map((l) => ({ ...l, updatedAt: l.updatedAt?.toISOString() ?? null }))}
    />
  );
}
