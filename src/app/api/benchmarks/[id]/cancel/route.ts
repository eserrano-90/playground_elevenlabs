import { handle, intParam } from "@/lib/api";
import { getRunner } from "@/lib/queue";

export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/benchmarks/[id]/cancel">) =>
  getRunner().cancel(intParam((await ctx.params).id)),
);
