import "server-only";
import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { getEnv, isJudgeConfigured, type Env } from "@/lib/env";

export type AiPurpose = "judge" | "assist";

/** The env vars that must be set for any AI feature (judge or scenario assist). */
export const AI_ENV_VARS = ["JUDGE_PROVIDER", "JUDGE_API_KEY", "JUDGE_MODEL"] as const;

/** Assist shares the judge provider and key; it's available whenever the judge is. */
export function isAssistConfigured(env: Env = getEnv()): boolean {
  return isJudgeConfigured(env);
}

/** Model ID for a purpose, without the provider prefix. `assist` prefers ASSIST_MODEL. */
export function aiModelId(purpose: AiPurpose, env: Env = getEnv()): string | undefined {
  return purpose === "assist" ? (env.ASSIST_MODEL ?? env.JUDGE_MODEL) : env.JUDGE_MODEL;
}

/** Builds the provider model for a purpose. Throws when the provider is not configured. */
export function getAiModel(purpose: AiPurpose, env: Env = getEnv()): { model: LanguageModel; id: string } {
  if (!isJudgeConfigured(env)) throw new Error(`AI ${purpose} is not configured`);
  const id = aiModelId(purpose, env)!;
  if (env.JUDGE_PROVIDER === "anthropic") {
    return { model: createAnthropic({ apiKey: env.JUDGE_API_KEY })(id), id: `anthropic/${id}` };
  }
  return { model: createOpenAI({ apiKey: env.JUDGE_API_KEY })(id), id: `openai/${id}` };
}
