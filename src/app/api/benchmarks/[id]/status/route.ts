import { getDb } from "@/db/client";
import { handle, intParam, notFound } from "@/lib/api";
import { benchmarkProgress, getBenchmark, listBenchmarkRuns } from "@/lib/services/benchmarks";

/** Polled by the benchmark page every 2 s. */
export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/benchmarks/[id]/status">) => {
  const db = getDb();
  const id = intParam((await ctx.params).id);
  const b = getBenchmark(db, id);
  if (!b) throw notFound("Benchmark");
  const runs = listBenchmarkRuns(db, id).map((r) => ({
    id: r.id,
    variantId: r.variantId,
    scenarioId: r.scenarioId,
    repetition: r.repetition,
    status: r.status,
    error: r.error,
    attempts: r.attempts,
  }));
  return { status: b.status, progress: benchmarkProgress(db, id), runs };
});
