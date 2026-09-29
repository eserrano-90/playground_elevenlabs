import { getDb } from "@/db/client";
import { handle, parseBody } from "@/lib/api";
import { createVariant, listVariants } from "@/lib/services/config";
import { variantInputSchema } from "@/lib/validation";

export const GET = handle(() => listVariants(getDb()));

export const POST = handle(async (req: Request) => {
  const input = await parseBody(req, variantInputSchema);
  return Response.json(createVariant(getDb(), input), { status: 201 });
});
