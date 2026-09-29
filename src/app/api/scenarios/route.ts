import { getDb } from "@/db/client";
import { handle, parseBody } from "@/lib/api";
import { createScenario, listScenarios } from "@/lib/services/config";
import { scenarioInputSchema } from "@/lib/validation";

export const GET = handle(() => listScenarios(getDb()));

export const POST = handle(async (req: Request) => {
  const input = await parseBody(req, scenarioInputSchema);
  return Response.json(createScenario(getDb(), input), { status: 201 });
});
