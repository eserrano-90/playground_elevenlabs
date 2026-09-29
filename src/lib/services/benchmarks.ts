import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { benchmarks, runs, scenarios, variants } from "@/db/schema";
import { estimateRunCostBeforeStart } from "@/lib/cost/cost";
import type { BenchmarkInput } from "@/lib/validation";
import { expandMatrix } from "./matrix";
import { getLlmPrice, getPricing } from "./pricing";

export class BenchmarkValidationError extends Error {}

export function estimateBenchmarkCost(db: DB, input: Pick<BenchmarkInput, "variantIds" | "scenarioIds" | "repetitions">) {
  const pricing = getPricing(db);
  const vs = db.select().from(variants).where(inArray(variants.id, input.variantIds)).all();
  const ss = db.select().from(scenarios).where(inArray(scenarios.id, input.scenarioIds)).all();
  let total = 0;
  for (const v of vs) {
    const llm = getLlmPrice(db, v.llm);
    for (const s of ss) {
      total +=
        estimateRunCostBeforeStart({ systemPrompt: s.systemPrompt, maxTurns: s.maxTurns, ttsModel: v.ttsModel }, pricing, llm) *
        input.repetitions;
    }
  }
  return total;
}

/** Creates a draft benchmark with one pending run per matrix cell. Not started until confirmed. */
export function createBenchmark(db: DB, input: BenchmarkInput, maxRuns: number) {
  const cells = expandMatrix(input.variantIds, input.scenarioIds, input.repetitions);
  if (cells.length > maxRuns) {
    throw new BenchmarkValidationError(
      `Benchmark would create ${cells.length} runs, above the limit of ${maxRuns} (BENCH_MAX_RUNS).`,
    );
  }
  const foundV = db.select({ id: variants.id }).from(variants).where(inArray(variants.id, input.variantIds)).all();
  const foundS = db.select({ id: scenarios.id }).from(scenarios).where(inArray(scenarios.id, input.scenarioIds)).all();
  if (foundV.length !== new Set(input.variantIds).size || foundS.length !== new Set(input.scenarioIds).size) {
    throw new BenchmarkValidationError("Unknown variant or scenario selected.");
  }
  const estimatedCostUsd = estimateBenchmarkCost(db, input);

  return db.transaction((tx) => {
    const b = tx
      .insert(benchmarks)
      .values({
        name: input.name,
        repetitions: input.repetitions,
        judgeEnabled: input.judgeEnabled,
        estimatedCostUsd,
      })
      .returning()
      .get();
    tx.insert(runs)
      .values(cells.map((c) => ({ ...c, benchmarkId: b.id, mode: "simulated" as const })))
      .run();
    return { benchmark: b, runCount: cells.length };
  });
}

export function listBenchmarks(db: DB) {
  const rows = db.select().from(benchmarks).orderBy(desc(benchmarks.createdAt), desc(benchmarks.id)).all();
  return rows.map((b) => ({ ...b, progress: benchmarkProgress(db, b.id) }));
}

export function getBenchmark(db: DB, id: number) {
  return db.select().from(benchmarks).where(eq(benchmarks.id, id)).get() ?? null;
}

export function benchmarkProgress(db: DB, id: number) {
  const rows = db
    .select({ status: runs.status, n: sql<number>`count(*)` })
    .from(runs)
    .where(eq(runs.benchmarkId, id))
    .groupBy(runs.status)
    .all();
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
  const total = rows.reduce((a, r) => a + r.n, 0);
  const done = (by.completed ?? 0) + (by.failed ?? 0) + (by.cancelled ?? 0);
  return {
    total,
    done,
    pending: by.pending ?? 0,
    running: by.running ?? 0,
    completed: by.completed ?? 0,
    failed: by.failed ?? 0,
    cancelled: by.cancelled ?? 0,
  };
}

export function deleteBenchmark(db: DB, id: number) {
  const b = getBenchmark(db, id);
  if (b?.status === "running") throw new BenchmarkValidationError("Cancel the benchmark before deleting it.");
  return db.delete(benchmarks).where(eq(benchmarks.id, id)).run().changes > 0;
}

export function listBenchmarkRuns(db: DB, id: number) {
  return db
    .select({
      id: runs.id,
      status: runs.status,
      repetition: runs.repetition,
      error: runs.error,
      variantId: runs.variantId,
      scenarioId: runs.scenarioId,
      attempts: runs.attempts,
      wallClockMs: runs.wallClockMs,
    })
    .from(runs)
    .where(and(eq(runs.benchmarkId, id)))
    .orderBy(runs.id)
    .all();
}
