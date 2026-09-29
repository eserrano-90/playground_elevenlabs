import { NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { AI_ENV_VARS, isAssistConfigured } from "@/lib/ai/model";
import { HttpError, handle, parseBody } from "@/lib/api";
import { generateScenarioDraft } from "@/lib/scenarios/generate";
import { generateInputSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  const input = await parseBody(req, generateInputSchema);
  if (!isAssistConfigured()) {
    throw new HttpError(503, `AI generation is not configured. Set ${AI_ENV_VARS.join(", ")}.`);
  }
  try {
    return await generateScenarioDraft(input);
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    console.error("Scenario generation failed", err);
    if (NoObjectGeneratedError.isInstance(err)) {
      throw new HttpError(502, "The model returned an unusable draft. Try again.");
    }
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new HttpError(502, "Generation timed out. Try again.");
    }
    throw new HttpError(502, `Generation failed: ${err instanceof Error ? err.message : "unknown error"}`);
  }
});
