import { getDb } from "@/db/client";
import { handle, intParam, notFound } from "@/lib/api";
import { aggregateByVariant, flattenAggregate, toCsv } from "@/lib/results";
import { getBenchmark } from "@/lib/services/benchmarks";
import { getBenchmarkResultRows } from "@/lib/services/results";

/**
 * `?format=json|csv` (default json), `?kind=runs|aggregate` (default runs),
 * `?scenarioId=` filters aggregates to one scenario.
 */
export const GET = handle(async (req: Request, ctx: RouteContext<"/api/benchmarks/[id]/results">) => {
  const db = getDb();
  const id = intParam((await ctx.params).id);
  if (!getBenchmark(db, id)) throw notFound("Benchmark");
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";
  const kind = url.searchParams.get("kind") ?? "runs";
  const scenarioParam = url.searchParams.get("scenarioId");
  const scenarioId = scenarioParam ? Number(scenarioParam) : null;

  const rows = getBenchmarkResultRows(db, id);
  const data = kind === "aggregate" ? aggregateByVariant(rows, scenarioId).map(flattenAggregate) : rows;
  const filename = `benchmark-${id}-${kind}.${format === "csv" ? "csv" : "json"}`;
  const headers = new Headers({ "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json" });
  if (url.searchParams.has("download")) headers.set("Content-Disposition", `attachment; filename="${filename}"`);

  const body = format === "csv" ? toCsv(data as object[]) : JSON.stringify(data, null, 2);
  return new Response(body, { headers });
});
