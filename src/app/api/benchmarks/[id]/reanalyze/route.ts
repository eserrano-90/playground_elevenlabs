import { z } from "zod";
import { getDb } from "@/db/client";
import { handle, intParam, notFound } from "@/lib/api";
import { getEnv, isJudgeConfigured } from "@/lib/env";
import { judgeTranscript } from "@/lib/analysis/judge";
import { reanalyzeBenchmark } from "@/lib/services/analysis";
import { getBenchmark } from "@/lib/services/benchmarks";

const schema = z.object({ rescoreJudge: z.boolean().default(false) });

/** Recomputes metrics and cost from stored transcripts (e.g. after a pricing change). */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/benchmarks/[id]/reanalyze">) => {
  const db = getDb();
  const id = intParam((await ctx.params).id);
  const b = getBenchmark(db, id);
  if (!b) throw notFound("Benchmark");
  const { rescoreJudge } = schema.parse(await req.json().catch(() => ({})));
  const judge = b.judgeEnabled && isJudgeConfigured(getEnv()) ? judgeTranscript : undefined;
  return reanalyzeBenchmark(db, id, { judge, rescoreJudge });
});
