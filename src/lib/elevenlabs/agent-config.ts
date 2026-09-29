import crypto from "node:crypto";
import type { Scenario, Variant } from "@/db/schema";

export const BENCH_AGENT_PREFIX = "bench-";

/** Conversational TTS models accepted by ElevenLabs Agents. */
export const CONVERSATIONAL_TTS_MODELS = [
  "eleven_v4",
  "eleven_v4_turbo",
  "eleven_flash_v2_5",
  "eleven_flash_v2",
  "eleven_turbo_v2_5",
  "eleven_turbo_v2",
  "eleven_multilingual_v2",
  "eleven_v3_conversational",
] as const;

export { ENGLISH_ONLY_TTS_MODELS, incompatiblePairs } from "./tts-compat";

/** Fixed LLM for the simulated user so only the agent under test varies between runs. */
export const SIMULATED_USER_LLM = "gpt-4o-mini";

export function agentName(variant: Pick<Variant, "id" | "name">, scenario: Pick<Scenario, "id">) {
  return `${BENCH_AGENT_PREFIX}v${variant.id}-s${scenario.id}-${variant.name}`.slice(0, 100);
}

type ConfigVariant = Pick<
  Variant,
  "id" | "name" | "llm" | "ttsModel" | "voiceId" | "temperature" | "maxTokens" | "stability" | "similarityBoost" | "speed"
>;
type ConfigScenario = Pick<Scenario, "id" | "systemPrompt" | "firstMessage" | "language">;

function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;
}

/** REST body (snake_case) for POST /v1/convai/agents/create and PATCH /v1/convai/agents/{id}. */
export function buildAgentBody(variant: ConfigVariant, scenario: ConfigScenario) {
  return {
    name: agentName(variant, scenario),
    tags: ["bench"],
    conversation_config: {
      agent: {
        first_message: scenario.firstMessage,
        language: scenario.language,
        prompt: defined({
          prompt: scenario.systemPrompt,
          llm: variant.llm,
          temperature: variant.temperature,
          max_tokens: variant.maxTokens,
        }),
      },
      tts: defined({
        model_id: variant.ttsModel,
        voice_id: variant.voiceId,
        stability: variant.stability,
        similarity_boost: variant.similarityBoost,
        speed: variant.speed,
      }),
    },
  };
}

/** Stable hash of the effective agent config; name excluded so renames don't force a PATCH. */
export function configHash(variant: ConfigVariant, scenario: ConfigScenario): string {
  const { conversation_config } = buildAgentBody(variant, scenario);
  return crypto.createHash("sha256").update(stableStringify(conversation_config)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

type SimScenario = Pick<Scenario, "language" | "userMode" | "personaPrompt" | "scriptedTurns" | "maxTurns">;

export function simulatedUserPrompt(scenario: SimScenario): string {
  if (scenario.userMode === "scripted") {
    const lines = (scenario.scriptedTurns ?? []).map((t, i) => `${i + 1}. ${t}`).join("\n");
    return [
      "You are a user talking to a voice assistant. Follow this script strictly.",
      "On each of your turns say the next line below verbatim, in order, without adding anything.",
      "After the last line, say goodbye briefly and stop.",
      "",
      lines,
    ].join("\n");
  }
  return scenario.personaPrompt ?? "You are a curious user asking the assistant questions.";
}

/** REST body for POST /v1/convai/agents/{id}/simulate-conversation. */
export function buildSimulationBody(scenario: SimScenario) {
  const turns =
    scenario.userMode === "scripted"
      ? // Each scripted line yields one user + one agent turn, plus a closing exchange.
        Math.min(scenario.maxTurns, ((scenario.scriptedTurns?.length ?? 0) + 1) * 2)
      : scenario.maxTurns;
  return {
    simulation_specification: {
      simulated_user_config: {
        language: scenario.language,
        prompt: { prompt: simulatedUserPrompt(scenario), llm: SIMULATED_USER_LLM, temperature: 0 },
      },
    },
    new_turns_limit: turns,
  };
}
