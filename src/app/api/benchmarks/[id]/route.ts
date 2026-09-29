import { getDb } from "@/db/client";
import { handle, intParam, notFound } from "@/lib/api";
import { benchmarkProgress, deleteBenchmark, getBenchmark } from "@/lib/services/benchmarks";

type Ctx = RouteContext<"/api/benchmarks/[id]">;

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const db = getDb();
  const id = intParam((await ctx.params).id);
  const b = getBenchmark(db, id);
  if (!b) throw notFound("Benchmark");
  return { ...b, progress: benchmarkProgress(db, id) };
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  deleteBenchmark(getDb(), intParam((await ctx.params).id));
});
