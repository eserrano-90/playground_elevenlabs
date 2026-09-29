import { getDb } from "@/db/client";
import { HttpError, handle, intParam } from "@/lib/api";
import { getComparisonTranscripts } from "@/lib/services/results";

/** `?scenarioId=1&variantIds=1,2` → transcripts aligned by turn index. */
export const GET = handle(async (req: Request, ctx: RouteContext<"/api/benchmarks/[id]/compare">) => {
  const url = new URL(req.url);
  const scenarioId = Number(url.searchParams.get("scenarioId"));
  const variantIds = (url.searchParams.get("variantIds") ?? "").split(",").filter(Boolean).map(Number);
  if (!scenarioId || variantIds.length < 2) throw new HttpError(400, "scenarioId and at least two variantIds are required");
  return getComparisonTranscripts(getDb(), intParam((await ctx.params).id), scenarioId, variantIds);
});
