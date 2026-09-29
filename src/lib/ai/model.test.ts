import { describe, expect, it } from "vitest";
import type { Env } from "@/lib/env";
import { aiModelId, getAiModel, isAssistConfigured } from "./model";

const base: Env = {
  ELEVENLABS_API_KEY: "test",
  DATABASE_PATH: ":memory:",
  JUDGE_PROVIDER: "openai",
  JUDGE_API_KEY: "sk-test",
  JUDGE_MODEL: "gpt-judge",
  ASSIST_MODEL: undefined,
  BENCH_CONCURRENCY: 2,
  BENCH_MAX_RUNS: 50,
};

describe("getAiModel", () => {
  it("assist falls back to JUDGE_MODEL", () => {
    expect(aiModelId("assist", base)).toBe("gpt-judge");
    expect(getAiModel("assist", base).id).toBe("openai/gpt-judge");
  });

  it("assist uses ASSIST_MODEL when set, judge keeps JUDGE_MODEL", () => {
    const env = { ...base, JUDGE_PROVIDER: "anthropic" as const, ASSIST_MODEL: "claude-writer" };
    expect(getAiModel("assist", env).id).toBe("anthropic/claude-writer");
    expect(getAiModel("judge", env).id).toBe("anthropic/gpt-judge");
  });

  it("is not configured when provider or key is missing", () => {
    expect(isAssistConfigured(base)).toBe(true);
    expect(isAssistConfigured({ ...base, JUDGE_PROVIDER: undefined })).toBe(false);
    expect(isAssistConfigured({ ...base, JUDGE_API_KEY: undefined })).toBe(false);
    expect(() => getAiModel("assist", { ...base, JUDGE_API_KEY: undefined })).toThrow(/not configured/);
  });
});
