import { getDb } from "@/db/client";
import { handle, intParam, notFound, parseBody } from "@/lib/api";
import { deleteScenario, getScenario, updateScenario } from "@/lib/services/config";
import { scenarioInputSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/scenarios/[id]">;

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const s = getScenario(getDb(), intParam((await ctx.params).id));
  if (!s) throw notFound("Scenario");
  return s;
});

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  const s = updateScenario(getDb(), id, await parseBody(req, scenarioInputSchema));
  if (!s) throw notFound("Scenario");
  return s;
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  deleteScenario(getDb(), intParam((await ctx.params).id));
});
