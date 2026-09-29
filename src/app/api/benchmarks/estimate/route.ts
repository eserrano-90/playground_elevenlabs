import { getDb } from "@/db/client";
import { handle, parseBody } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { ESTIMATE_ASSUMPTIONS } from "@/lib/cost/cost";
import { estimateBenchmarkCost } from "@/lib/services/benchmarks";
import { benchmarkInputSchema } from "@/lib/validation";

const schema = benchmarkInputSchema.pick({ variantIds: true, scenarioIds: true, repetitions: true });

export const POST = handle(async (req: Request) => {
  const input = await parseBody(req, schema);
  return {
    estimatedCostUsd: estimateBenchmarkCost(getDb(), input),
    runCount: input.variantIds.length * input.scenarioIds.length * input.repetitions,
    maxRuns: getEnv().BENCH_MAX_RUNS,
    assumptions: ESTIMATE_ASSUMPTIONS,
  };
});
