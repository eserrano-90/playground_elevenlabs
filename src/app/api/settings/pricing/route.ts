import { getDb } from "@/db/client";
import { handle, parseBody } from "@/lib/api";
import { getPricing, listLlmOptions, updatePricing } from "@/lib/services/pricing";
import { pricingInputSchema } from "@/lib/validation";

export const GET = handle(() => {
  const db = getDb();
  return { pricing: getPricing(db), llms: listLlmOptions(db) };
});

export const PUT = handle(async (req: Request) => updatePricing(getDb(), await parseBody(req, pricingInputSchema)));
