import { getDb } from "@/db/client";
import { handle, parseBody } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { createBenchmark, listBenchmarks } from "@/lib/services/benchmarks";
import { benchmarkInputSchema } from "@/lib/validation";

export const GET = handle(() => listBenchmarks(getDb()));

/** Creates a draft benchmark with pending runs. Execution starts via `/start` after confirmation. */
export const POST = handle(async (req: Request) => {
  const input = await parseBody(req, benchmarkInputSchema);
  const result = createBenchmark(getDb(), input, getEnv().BENCH_MAX_RUNS);
  return Response.json(result, { status: 201 });
});
