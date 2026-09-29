import { getDb } from "@/db/client";
import { handle, intParam, notFound, parseBody } from "@/lib/api";
import { deleteVariant, getVariant, updateVariant } from "@/lib/services/config";
import { variantInputSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/variants/[id]">;

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const v = getVariant(getDb(), intParam((await ctx.params).id));
  if (!v) throw notFound("Variant");
  return v;
});

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  const v = updateVariant(getDb(), id, await parseBody(req, variantInputSchema));
  if (!v) throw notFound("Variant");
  return v;
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  deleteVariant(getDb(), intParam((await ctx.params).id));
});
