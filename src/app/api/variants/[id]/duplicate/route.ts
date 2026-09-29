import { getDb } from "@/db/client";
import { handle, intParam, notFound } from "@/lib/api";
import { duplicateVariant } from "@/lib/services/config";

export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/variants/[id]/duplicate">) => {
  const v = duplicateVariant(getDb(), intParam((await ctx.params).id));
  if (!v) throw notFound("Variant");
  return Response.json(v, { status: 201 });
});
