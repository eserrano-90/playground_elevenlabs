import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { testDb } from "@/test/db";
import { benchmarks, runMetrics, runs } from "@/db/schema";
import { ElevenLabsError } from "@/lib/elevenlabs/http";
import type { NormalizedTurn } from "@/lib/elevenlabs/transcript";
import { scenarioInputSchema, variantInputSchema } from "@/lib/validation";
import { createScenario, createVariant } from "@/lib/services/config";
import { createBenchmark } from "@/lib/services/benchmarks";
import { createRunner } from "./runner";

const turn = (index: number, role: "agent" | "user", message: string): NormalizedTurn => ({
  index,
  role,
  message,
  timeInCallSecs: index,
  llmTtfbMs: role === "agent" ? 400 : null,
  ttsTtfbMs: role === "agent" ? 150 : null,
  llmModel: role === "agent" ? "gpt-4o-mini" : null,
  llmInputTokens: role === "agent" ? 200 : null,
  llmOutputTokens: role === "agent" ? 40 : null,
  llmPriceUsd: null,
});

const simResult = {
  turns: [
    turn(0, "agent", "Hello! How can I help you today?"),
    turn(1, "user", "What are your opening hours?"),
    turn(2, "agent", "We are open from nine in the morning to six in the evening, Monday to Friday."),
  ],
  analysis: {},
  raw: { ok: true },
};

function setup(runsPerBenchmark = 1) {
  const db = testDb();
  const variant = createVariant(
    db,
    variantInputSchema.parse({ name: "a", llm: "gpt-4o-mini", ttsModel: "eleven_flash_v2_5", voiceId: "v" }),
  );
  const scenario = createScenario(
    db,
    scenarioInputSchema.parse({
      name: "s",
      systemPrompt: "Support agent",
      firstMessage: "Hello!",
      userMode: "persona",
      personaPrompt: "Ask about hours",
      maxTurns: 4,
    }),
  );
  const { benchmark } = createBenchmark(
    db,
    { name: "b", variantIds: [variant.id], scenarioIds: [scenario.id], repetitions: runsPerBenchmark, judgeEnabled: false },
    50,
  );
  return { db, benchmark };
}

function fakeEl(simulate: () => Promise<typeof simResult>) {
  return {
    createAgent: vi.fn(async () => "agent_1"),
    updateAgent: vi.fn(async () => {}),
    simulateConversation: vi.fn(simulate),
  };
}

describe("runner", () => {
  it("completes runs, stores metrics and finishes the benchmark", async () => {
    const { db, benchmark } = setup(2);
    const el = fakeEl(async () => simResult);
    const runner = createRunner({ db, el, concurrency: 2, minRetryTimeoutMs: 1 });
    expect(runner.start(benchmark.id).enqueued).toBe(2);
    await runner.onIdle();

    const rs = db.select().from(runs).where(eq(runs.benchmarkId, benchmark.id)).all();
    expect(rs.map((r) => [r.status, r.error])).toEqual(rs.map(() => ["completed", null]));
    expect(rs[0].durationSource).toBe("estimated");
    // Agent provisioned once, reused for the second run.
    expect(el.createAgent).toHaveBeenCalledTimes(1);

    const m = db.select().from(runMetrics).where(eq(runMetrics.runId, rs[0].id)).get()!;
    expect(m.latencyMeanMs).toBeCloseTo(550);
    expect(m.costSource).toBe("estimated");
    expect(m.costUsd).toBeGreaterThan(0);
    expect(m.compositeScore).toBeGreaterThan(0);
    expect(db.select().from(benchmarks).where(eq(benchmarks.id, benchmark.id)).get()!.status).toBe("completed");
  });

  it("retries retryable errors then succeeds", async () => {
    const { db, benchmark } = setup();
    let calls = 0;
    const el = fakeEl(async () => {
      if (++calls < 3) throw new ElevenLabsError("rate limited", 429, null);
      return simResult;
    });
    const runner = createRunner({ db, el, concurrency: 1, minRetryTimeoutMs: 1 });
    runner.start(benchmark.id);
    await runner.onIdle();
    const r = db.select().from(runs).where(eq(runs.benchmarkId, benchmark.id)).get()!;
    expect(r.status).toBe("completed");
    expect(r.attempts).toBe(3);
  });

  it("marks run failed after exhausting retries", async () => {
    const { db, benchmark } = setup();
    const el = fakeEl(async () => {
      throw new ElevenLabsError("server error", 503, null);
    });
    const runner = createRunner({ db, el, concurrency: 1, minRetryTimeoutMs: 1 });
    runner.start(benchmark.id);
    await runner.onIdle();
    const r = db.select().from(runs).where(eq(runs.benchmarkId, benchmark.id)).get()!;
    expect(r.status).toBe("failed");
    expect(r.attempts).toBe(4); // 1 + 3 retries
    expect(r.error).toContain("server error");
  });

  it("does not retry non-retryable errors", async () => {
    const { db, benchmark } = setup();
    const el = fakeEl(async () => {
      throw new ElevenLabsError("bad voice", 422, null);
    });
    const runner = createRunner({ db, el, concurrency: 1, minRetryTimeoutMs: 1 });
    runner.start(benchmark.id);
    await runner.onIdle();
    const r = db.select().from(runs).where(eq(runs.benchmarkId, benchmark.id)).get()!;
    expect(r.status).toBe("failed");
    expect(r.attempts).toBe(1);
  });

  it("cancel marks pending runs cancelled and stops dispatching", async () => {
    const { db, benchmark } = setup(4);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const el = fakeEl(async () => {
      await gate;
      return simResult;
    });
    const runner = createRunner({ db, el, concurrency: 1, minRetryTimeoutMs: 1 });
    runner.start(benchmark.id);
    await vi.waitFor(() => expect(el.simulateConversation).toHaveBeenCalledTimes(1));
    expect(runner.cancel(benchmark.id).cancelled).toBe(3);
    release();
    await runner.onIdle();
    const statuses = db.select().from(runs).where(eq(runs.benchmarkId, benchmark.id)).all().map((r) => r.status);
    expect(statuses.sort()).toEqual(["cancelled", "cancelled", "cancelled", "completed"]);
    expect(el.simulateConversation).toHaveBeenCalledTimes(1);
    expect(db.select().from(benchmarks).where(eq(benchmarks.id, benchmark.id)).get()!.status).toBe("cancelled");
  });
});
