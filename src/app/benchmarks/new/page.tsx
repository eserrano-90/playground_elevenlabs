import { getDb } from "@/db/client";
import { getEnv, isJudgeConfigured } from "@/lib/env";
import { listScenarios, listVariants } from "@/lib/services/config";
import { listLlmOptions } from "@/lib/services/pricing";
import { getT } from "@/lib/i18n/server";
import { NewBenchmarkForm } from "./new-benchmark-form";

export const dynamic = "force-dynamic";

export default async function NewBenchmarkPage() {
  const t = await getT();
  const db = getDb();
  const env = getEnv();
  const llmLabels = new Map(listLlmOptions(db).map((l) => [l.id, l.label]));
  return (
    <NewBenchmarkForm
      variants={listVariants(db).map((v) => ({
        id: v.id,
        name: v.name,
        detail: `${llmLabels.get(v.llm) ?? v.llm} · ${v.ttsModel} · ${v.voiceName ?? v.voiceId}`,
        ttsModel: v.ttsModel,
      }))}
      scenarios={listScenarios(db).map((s) => ({
        id: s.id,
        name: s.name,
        detail: `${(t.languages as Record<string, string>)[s.language] ?? s.language.toUpperCase()} · ${t.newBenchmark.userModes[s.userMode]} · ${t.newBenchmark.maxTurns(s.maxTurns)}`,
        language: s.language,
      }))}
      maxRuns={env.BENCH_MAX_RUNS}
      judgeAvailable={isJudgeConfigured(env)}
    />
  );
}
