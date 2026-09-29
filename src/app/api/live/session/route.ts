import { z } from "zod";
import { getDb } from "@/db/client";
import { handle, parseBody } from "@/lib/api";
import { getElevenLabs } from "@/lib/elevenlabs";
import { startLiveSession } from "@/lib/services/live";

const schema = z.object({ variantId: z.coerce.number().int(), scenarioId: z.coerce.number().int() });

/** Provisions the agent and returns a short-lived conversation token for the browser SDK. */
export const POST = handle(async (req: Request) => {
  const { variantId, scenarioId } = await parseBody(req, schema);
  return startLiveSession(getDb(), getElevenLabs(), variantId, scenarioId);
});
