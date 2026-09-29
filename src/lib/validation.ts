import { z } from "zod";

/** Languages a scenario (and its ElevenLabs agent) can use. Readability formulas exist for each. */
export const SCENARIO_LANGUAGES = ["en", "es", "fr"] as const;
export type ScenarioLanguage = (typeof SCENARIO_LANGUAGES)[number];

const optionalNumber = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().min(min).max(max).nullable());

export const variantInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  llm: z.string().trim().min(1, "LLM is required"),
  ttsModel: z.string().trim().min(1, "TTS model is required"),
  voiceId: z.string().trim().min(1, "Voice is required"),
  voiceName: z.string().trim().nullish(),
  temperature: optionalNumber(0, 2),
  maxTokens: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce.number().int().min(1).max(8192).nullable(),
  ),
  stability: optionalNumber(0, 1),
  similarityBoost: optionalNumber(0, 1),
  speed: optionalNumber(0.7, 1.2),
});
export type VariantInput = z.infer<typeof variantInputSchema>;

export const scenarioInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    systemPrompt: z.string().trim().min(1, "System prompt is required"),
    firstMessage: z.string().trim().min(1, "First message is required"),
    language: z.enum(SCENARIO_LANGUAGES).default("en"),
    userMode: z.enum(["persona", "scripted"]),
    personaPrompt: z.string().trim().nullish(),
    scriptedTurns: z.array(z.string().trim().min(1)).nullish(),
    maxTurns: z.coerce.number().int().min(2).max(50).default(10),
  })
  .superRefine((s, ctx) => {
    if (s.userMode === "persona" && !s.personaPrompt) {
      ctx.addIssue({ code: "custom", path: ["personaPrompt"], message: "Persona prompt is required" });
    }
    if (s.userMode === "scripted" && !s.scriptedTurns?.length) {
      ctx.addIssue({ code: "custom", path: ["scriptedTurns"], message: "At least one scripted turn is required" });
    }
  });
export type ScenarioInput = z.infer<typeof scenarioInputSchema>;

export const generateInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Describe the scenario in at least 10 characters")
    .max(1000, "Keep the description under 1000 characters"),
  language: z.enum(SCENARIO_LANGUAGES).default("en"),
  tone: z.string().trim().max(60, "Keep the tone under 60 characters").optional(),
  userMode: z.enum(["persona", "scripted"]).default("scripted"),
  includeUser: z.boolean().default(true),
});
export type GenerateInput = z.infer<typeof generateInputSchema>;

export const benchmarkInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  variantIds: z.array(z.coerce.number().int()).min(1, "Select at least one variant"),
  scenarioIds: z.array(z.coerce.number().int()).min(1, "Select at least one scenario"),
  repetitions: z.coerce.number().int().min(1).max(10).default(1),
  judgeEnabled: z.boolean().default(false),
});
export type BenchmarkInput = z.infer<typeof benchmarkInputSchema>;

export const pricingInputSchema = z.object({
  usdPerCredit: z.coerce.number().min(0),
  plan: z.string().min(1),
  agentUsdPerMinuteByPlan: z.record(z.string(), z.coerce.number().min(0)),
  speechRateByTtsModel: z.record(z.string(), z.coerce.number().positive()),
});

export const llmPriceInputSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  provider: z.string().trim().min(1),
  inputUsdPerMTok: z.coerce.number().min(0),
  outputUsdPerMTok: z.coerce.number().min(0),
});

/** Flattens Zod issues to `{ field: message }` for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
