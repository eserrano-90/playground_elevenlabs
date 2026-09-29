import PQueue from "p-queue";
import pRetry from "p-retry";
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "@/db/client";
import { benchmarks, runs, runTurns, scenarios, variants } from "@/db/schema";
import type { ElevenLabsClient } from "@/lib/elevenlabs/client";
import { buildSimulationBody } from "@/lib/elevenlabs/agent-config";
import { isRetryableError } from "@/lib/elevenlabs/http";
import { ensureAgent } from "@/lib/elevenlabs/provisioning";
import type { NormalizedTurn } from "@/lib/elevenlabs/transcript";
import { estimateDurationSecs } from "@/lib/cost/cost";
import { analyzeRun, type JudgeFn } from "@/lib/services/analysis";
import { getPricing } from "@/lib/services/pricing";

export interface RunnerDeps {
  db: DB;
  el: Pick<ElevenLabsClient, "simulateConversation" | "createAgent" | "updateAgent">;
  concurrency: number;
  /** Returns the judge to use for a benchmark, or undefined to skip judge scoring. */
  judgeFor?: (judgeEnabled: boolean) => JudgeFn | undefined;
  retries?: number;
  minRetryTimeoutMs?: number;
}

export const DEFAULT_RETRIES = 3;

export function createRunner(deps: RunnerDeps) {
  const { db } = deps;
  const queue = new PQueue({ concurrency: deps.concurrency });

  function persistTurns(runId: number, turns: NormalizedTurn[]) {
    db.transaction((tx) => {
      tx.delete(runTurns).where(eq(runTurns.runId, runId)).run();
      if (turns.length) tx.insert(runTurns).values(turns.map((t) => ({ ...t, runId }))).run();
    });
  }

  function maybeFinishBenchmark(benchmarkId: number | null) {
    if (benchmarkId == null) return;
    const open = db
      .select({ id: runs.id })
      .from(runs)
      .where(and(eq(runs.benchmarkId, benchmarkId), inArray(runs.status, ["pending", "running"])))
      .all();
    if (open.length > 0) return;
    db.update(benchmarks)
      .set({ status: "completed", finishedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(benchmarks.id, benchmarkId), eq(benchmarks.status, "running")))
      .run();
  }

  async function executeRun(runId: number): Promise<void> {
    const run = db.select().from(runs).where(eq(runs.id, runId)).get();
    // Cancelled (or otherwise non-pending) runs are skipped when dequeued.
    if (!run || run.status !== "pending") return;
    const benchmark = run.benchmarkId
      ? db.select().from(benchmarks).where(eq(benchmarks.id, run.benchmarkId)).get()
      : undefined;
    const variant = db.select().from(variants).where(eq(variants.id, run.variantId)).get()!;
    const scenario = db.select().from(scenarios).where(eq(scenarios.id, run.scenarioId)).get()!;

    db.update(runs).set({ status: "running", startedAt: new Date(), error: null }).where(eq(runs.id, runId)).run();
    const t0 = Date.now();
    let attempts = 0;
    try {
      const { agentId, result } = await pRetry(
        async () => {
          attempts++;
          db.update(runs).set({ attempts }).where(eq(runs.id, runId)).run();
          const { agentId } = await ensureAgent(db, deps.el as ElevenLabsClient, variant, scenario);
          const result = await deps.el.simulateConversation(agentId, buildSimulationBody(scenario));
          return { agentId, result };
        },
        {
          retries: deps.retries ?? DEFAULT_RETRIES,
          factor: 2,
          minTimeout: deps.minRetryTimeoutMs ?? 1000,
          shouldRetry: ({ error }) => isRetryableError(error),
        },
      );

      persistTurns(runId, result.turns);
      const pricing = getPricing(db);
      db.update(runs)
        .set({
          status: "completed",
          agentId,
          rawResponse: result.raw,
          wallClockMs: Date.now() - t0,
          // Simulations produce no audio; spoken duration is estimated from text.
          durationSecs: estimateDurationSecs(result.turns, pricing, variant.ttsModel),
          durationSource: "estimated",
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(runs.id, runId))
        .run();

      await analyzeRun(db, runId, { judge: deps.judgeFor?.(benchmark?.judgeEnabled ?? false) });
    } catch (err) {
      db.update(runs)
        .set({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          wallClockMs: Date.now() - t0,
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(runs.id, runId))
        .run();
    } finally {
      maybeFinishBenchmark(run.benchmarkId);
    }
  }

  function start(benchmarkId: number) {
    const b = db.select().from(benchmarks).where(eq(benchmarks.id, benchmarkId)).get();
    if (!b) throw new Error("Benchmark not found");
    if (b.status === "running") return { enqueued: 0 };
    // Restarting re-queues failed runs; completed runs are kept.
    db.update(runs)
      .set({ status: "pending", error: null })
      .where(and(eq(runs.benchmarkId, benchmarkId), inArray(runs.status, ["failed", "cancelled"])))
      .run();
    const pending = db
      .select({ id: runs.id })
      .from(runs)
      .where(and(eq(runs.benchmarkId, benchmarkId), eq(runs.status, "pending")))
      .all();
    db.update(benchmarks)
      .set({ status: "running", startedAt: b.startedAt ?? new Date(), finishedAt: null, updatedAt: new Date() })
      .where(eq(benchmarks.id, benchmarkId))
      .run();
    for (const r of pending) void queue.add(() => executeRun(r.id));
    if (pending.length === 0) maybeFinishBenchmark(benchmarkId);
    return { enqueued: pending.length };
  }

  /** Pending runs → cancelled; in-flight runs finish normally. */
  function cancel(benchmarkId: number) {
    const res = db
      .update(runs)
      .set({ status: "cancelled", finishedAt: new Date() })
      .where(and(eq(runs.benchmarkId, benchmarkId), eq(runs.status, "pending")))
      .run();
    db.update(benchmarks)
      .set({ status: "cancelled", finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(benchmarks.id, benchmarkId))
      .run();
    return { cancelled: res.changes };
  }

  return { start, cancel, executeRun, queue, onIdle: () => queue.onIdle() };
}

export type Runner = ReturnType<typeof createRunner>;
