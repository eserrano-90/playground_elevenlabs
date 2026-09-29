import { getDb } from "@/db/client";
import { AI_ENV_VARS, aiModelId, isAssistConfigured } from "@/lib/ai/model";
import { getEnv } from "@/lib/env";
import { SCENARIO_TEMPLATES } from "@/lib/scenarios/templates";
import { listScenarios } from "@/lib/services/config";
import { ScenariosManager } from "./scenarios-manager";

export const dynamic = "force-dynamic";

export default function ScenariosPage() {
  const env = getEnv();
  const assist = {
    model: isAssistConfigured(env) ? `${env.JUDGE_PROVIDER}/${aiModelId("assist", env)}` : null,
    missing: AI_ENV_VARS.filter((k) => !env[k]),
  };
  return <ScenariosManager initialScenarios={listScenarios(getDb())} templates={SCENARIO_TEMPLATES} assist={assist} />;
}
