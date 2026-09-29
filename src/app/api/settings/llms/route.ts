import { getDb } from "@/db/client";
import { handle, parseBody } from "@/lib/api";
import { upsertLlmOption } from "@/lib/services/pricing";
import { llmPriceInputSchema } from "@/lib/validation";

/** Creates or updates an LLM option and its token prices. */
export const POST = handle(async (req: Request) => upsertLlmOption(getDb(), await parseBody(req, llmPriceInputSchema)));
