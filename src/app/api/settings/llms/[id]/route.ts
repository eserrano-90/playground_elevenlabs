import { getDb } from "@/db/client";
import { handle } from "@/lib/api";
import { deleteLlmOption } from "@/lib/services/pricing";

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/settings/llms/[id]">) => {
  deleteLlmOption(getDb(), decodeURIComponent((await ctx.params).id));
});
