import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { computeRunCost, costPerMinute, estimateDurationSecs, type PricingInput } from "./cost";
import { percentile, stats } from "./aggregate";
import { testDb } from "@/test/db";
import { runMetrics, runs, runTurns } from "@/db/schema";
import { scenarioInputSchema, variantInputSchema } from "@/lib/validation";
import { createScenario, createVariant } from "@/lib/services/config";
import { analyzeRun } from "@/lib/services/analysis";
import { upsertLlmOption } from "@/lib/services/pricing";

const pricing: PricingInput = {
  usdPerCredit: 0.0002,
  plan: "pro",
  agentUsdPerMinuteByPlan: { pro: 0.1 },
  speechRateByTtsModel: { default: 10 },
};
const llm = { inputUsdPerMTok: 1, outputUsdPerMTok: 2 };

describe("cost per minute", () => {
  it("90 s at 0.15 USD → 0.10 USD/min", () => {
    expect(costPerMinute(0.15, 90)).toBeCloseTo(0.1);
  });
  it("zero or unknown duration → not applicable", () => {
    expect(costPerMinute(1, 0)).toBeNull();
    expect(costPerMinute(1, null)).toBeNull();
  });
});

describe("computeRunCost", () => {
  const turns = [
    { role: "agent" as const, message: "hello", llmInputTokens: 1_000, llmOutputTokens: 500, llmPriceUsd: null },
    { role: "user" as const, message: "hi", llmInputTokens: null, llmOutputTokens: null, llmPriceUsd: null },
  ];

  it("prefers reported fiat cost", () => {
    const c = computeRunCost({ durationSecs: 90, ttsModel: "x", turns, reportedCostFiatUsd: 0.15, reportedLlmChargeUsd: 0.05 }, pricing, llm);
    expect(c).toMatchObject({ costSource: "reported", costUsd: 0.15, llmCostUsd: 0.05 });
    expect(c.voiceCostUsd).toBeCloseTo(0.1);
    expect(c.costPerMinuteUsd).toBeCloseTo(0.1);
    expect(c.costPerTurnUsd).toBeCloseTo(0.15);
  });

  it("estimates when nothing is reported (simulated runs)", () => {
    const c = computeRunCost({ durationSecs: 60, ttsModel: "x", turns }, pricing, llm);
    expect(c.costSource).toBe("estimated");
    expect(c.voiceCostUsd).toBeCloseTo(0.1);
    expect(c.llmCostUsd).toBeCloseTo((1_000 * 1 + 500 * 2) / 1e6);
  });

  it("uses per-turn reported llm prices over the price table", () => {
    const c = computeRunCost(
      { durationSecs: 60, ttsModel: "x", turns: [{ ...turns[0], llmPriceUsd: 0.5 }] },
      pricing,
      llm,
    );
    expect(c.llmCostUsd).toBe(0.5);
  });

  it("estimates spoken duration from characters", () => {
    expect(estimateDurationSecs([{ message: "a".repeat(100) }], pricing, "unknown")).toBe(10);
  });
});

describe("aggregation", () => {
  it("computes mean/min/max/std ignoring nulls", () => {
    const s = stats([0.1, 0.2, null, 0.3]);
    expect(s.n).toBe(3);
    expect(s.mean).toBeCloseTo(0.2);
    expect(s.min).toBe(0.1);
    expect(s.max).toBe(0.3);
    expect(s.std).toBeCloseTo(0.1);
    expect(stats([]).mean).toBeNull();
  });
  it("interpolates percentiles", () => {
    expect(percentile([100, 200, 300, 400, 500], 95)).toBeCloseTo(480);
    expect(percentile([], 95)).toBeNull();
  });
});

describe("pricing change recompute", () => {
  it("re-analysis uses the updated LLM price", async () => {
    const db = testDb();
    const v = createVariant(db, variantInputSchema.parse({ name: "a", llm: "test-llm", ttsModel: "eleven_flash_v2_5", voiceId: "v" }));
    const s = createScenario(
      db,
      scenarioInputSchema.parse({ name: "s", systemPrompt: "p", firstMessage: "hi", userMode: "persona", personaPrompt: "x" }),
    );
    upsertLlmOption(db, { id: "test-llm", label: "t", provider: "t", inputUsdPerMTok: 1, outputUsdPerMTok: 1 });
    const run = db
      .insert(runs)
      .values({ variantId: v.id, scenarioId: s.id, mode: "simulated", status: "completed", durationSecs: 60 })
      .returning()
      .get();
    db.insert(runTurns)
      .values({ runId: run.id, index: 0, role: "agent", message: "Hello there.", llmInputTokens: 1_000_000, llmOutputTokens: 0 })
      .run();

    await analyzeRun(db, run.id);
    const before = db.select().from(runMetrics).where(eq(runMetrics.runId, run.id)).get()!;
    expect(before.llmCostUsd).toBeCloseTo(1);

    upsertLlmOption(db, { id: "test-llm", label: "t", provider: "t", inputUsdPerMTok: 3, outputUsdPerMTok: 1 });
    await analyzeRun(db, run.id);
    const after = db.select().from(runMetrics).where(eq(runMetrics.runId, run.id)).get()!;
    expect(after.llmCostUsd).toBeCloseTo(3);
  });
});
