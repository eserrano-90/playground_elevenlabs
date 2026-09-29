// Client-safe: kept apart from agent-config, which imports node:crypto.

/** TTS models that only speak English; pairing them with another scenario language sounds wrong. */
export const ENGLISH_ONLY_TTS_MODELS: readonly string[] = ["eleven_flash_v2", "eleven_turbo_v2"];

/** Selected variant × scenario pairs where an English-only TTS model meets a non-English scenario. */
export function incompatiblePairs<V extends { ttsModel: string }, S extends { language: string }>(
  variants: V[],
  scenarios: S[],
): { variant: V; scenario: S }[] {
  return variants
    .filter((v) => ENGLISH_ONLY_TTS_MODELS.includes(v.ttsModel))
    .flatMap((variant) => scenarios.filter((s) => !s.language.startsWith("en")).map((scenario) => ({ variant, scenario })));
}
