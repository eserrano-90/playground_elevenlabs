import { describe, expect, it } from "vitest";
import { testDb } from "@/test/db";
import { scenarioInputSchema, variantInputSchema, fieldErrors } from "@/lib/validation";
import { expandMatrix } from "./matrix";
import { createScenario, createVariant, duplicateVariant } from "./config";
import { BenchmarkValidationError, benchmarkProgress, createBenchmark } from "./benchmarks";

const v = (name: string, llm = "gpt-4o-mini") =>
  variantInputSchema.parse({ name, llm, ttsModel: "eleven_flash_v2_5", voiceId: "voice1" });
const s = (name: string) =>
  scenarioInputSchema.parse({
    name,
    systemPrompt: "You are a support agent.",
    firstMessage: "Hello!",
    language: "en",
    userMode: "scripted",
    scriptedTurns: ["Hi", "Bye"],
    maxTurns: 6,
  });

describe("matrix expansion", () => {
  it("creates variants × scenarios × repetitions runs", () => {
    expect(expandMatrix([1, 2, 3], [10, 20], 2)).toHaveLength(12);
  });

  it("persists 12 pending runs with a cost estimate", () => {
    const db = testDb();
    const vs = [v("a"), v("b", "gpt-4o"), v("c", "claude-haiku-4-5")].map((x) => createVariant(db, x));
    const ss = [s("s1"), s("s2")].map((x) => createScenario(db, x));
    const { benchmark, runCount } = createBenchmark(
      db,
      { name: "b", variantIds: vs.map((x) => x.id), scenarioIds: ss.map((x) => x.id), repetitions: 2, judgeEnabled: false },
      50,
    );
    expect(runCount).toBe(12);
    expect(benchmark.status).toBe("draft");
    expect(benchmark.estimatedCostUsd).toBeGreaterThan(0);
    expect(benchmarkProgress(db, benchmark.id)).toMatchObject({ total: 12, pending: 12, done: 0 });
  });

  it("enforces the max-runs cap", () => {
    const db = testDb();
    const a = createVariant(db, v("a"));
    const sc = createScenario(db, s("s"));
    expect(() =>
      createBenchmark(db, { name: "b", variantIds: [a.id], scenarioIds: [sc.id], repetitions: 5, judgeEnabled: false }, 3),
    ).toThrow(BenchmarkValidationError);
  });

  it("duplicates a variant", () => {
    const db = testDb();
    const a = createVariant(db, v("a"));
    const copy = duplicateVariant(db, a.id)!;
    expect(copy.id).not.toBe(a.id);
    expect(copy.name).toBe("a (copy)");
    expect(copy.llm).toBe(a.llm);
  });
});

describe("validation", () => {
  it("reports each missing variant field", () => {
    const r = variantInputSchema.safeParse({ name: "x", llm: "", ttsModel: "", voiceId: "" });
    expect(r.success).toBe(false);
    const errs = fieldErrors(r.error!);
    expect(Object.keys(errs).sort()).toEqual(["llm", "ttsModel", "voiceId"]);
    expect(errs.voiceId).toBe("Voice is required");
  });

  it("requires persona prompt or scripted turns depending on mode", () => {
    const base = { name: "s", systemPrompt: "p", firstMessage: "hi", language: "en", maxTurns: 4 };
    expect(fieldErrors(scenarioInputSchema.safeParse({ ...base, userMode: "persona" }).error!)).toHaveProperty("personaPrompt");
    expect(
      fieldErrors(scenarioInputSchema.safeParse({ ...base, userMode: "scripted", scriptedTurns: [] }).error!),
    ).toHaveProperty("scriptedTurns");
  });
});
