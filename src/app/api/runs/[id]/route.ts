import { getDb } from "@/db/client";
import { handle, intParam, notFound } from "@/lib/api";
import { getRunDetail } from "@/lib/services/results";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/runs/[id]">) => {
  const detail = getRunDetail(getDb(), intParam((await ctx.params).id));
  if (!detail) throw notFound("Run");
  return detail;
});
