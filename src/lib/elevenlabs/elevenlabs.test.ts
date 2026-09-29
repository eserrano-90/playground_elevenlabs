import { describe, expect, it, vi } from "vitest";
import { ElevenLabsClient } from "./client";
import { ElevenLabsError, isRetryableError, isRetryableStatus } from "./http";
import { buildAgentBody, buildSimulationBody, configHash, incompatiblePairs } from "./agent-config";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

const variant = {
  id: 1,
  name: "fast",
  llm: "gpt-4o-mini",
  ttsModel: "eleven_flash_v2_5",
  voiceId: "voice123",
  temperature: 0.3,
  maxTokens: null,
  stability: null,
  similarityBoost: null,
  speed: 1.1,
};
const scenario = {
  id: 2,
  systemPrompt: "You are a helpful support agent.",
  firstMessage: "Hi!",
  language: "en",
  userMode: "scripted" as const,
  personaPrompt: null,
  scriptedTurns: ["What are your hours?", "Thanks"],
  maxTurns: 10,
};

describe("retry classification", () => {
  it("treats 429, 5xx and network errors as retryable", () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(null)).toBe(true);
  });
  it("treats 4xx caller errors as non-retryable", () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(422)).toBe(false);
    expect(isRetryableError(new Error("x"))).toBe(false);
  });
  it("surfaces API error detail and status", async () => {
    const el = new ElevenLabsClient({
      apiKey: "k",
      fetch: mockFetch(429, { detail: { message: "rate limited" } }),
    });
    const err = await el.createAgent({}).catch((e) => e);
    expect(err).toBeInstanceOf(ElevenLabsError);
    expect(err.status).toBe(429);
    expect(err.retryable).toBe(true);
    expect(err.message).toContain("rate limited");
  });
  it("wraps network failures as retryable", async () => {
    const el = new ElevenLabsClient({
      apiKey: "k",
      fetch: vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    });
    const err = await el.listTtsModels().catch((e) => e);
    expect(err).toBeInstanceOf(ElevenLabsError);
    expect(err.retryable).toBe(true);
  });
});

describe("response parsing", () => {
  it("normalizes simulated conversations with metrics and llm usage", async () => {
    const fetch = mockFetch(200, {
      simulated_conversation: [
        {
          role: "agent",
          message: "Hi!",
          time_in_call_secs: 0,
          conversation_turn_metrics: null,
        },
        { role: "user", message: "What are your hours?", time_in_call_secs: 2 },
        { role: "agent", message: "", time_in_call_secs: 3, tool_calls: [{}] },
        {
          role: "agent",
          message: "We open at 9am.",
          time_in_call_secs: 4,
          conversation_turn_metrics: {
            metrics: {
              convai_llm_service_ttfb: { elapsed_time: 0.42 },
              convai_tts_service_ttfb: { elapsed_time: 0.18 },
            },
          },
          llm_usage: {
            model_usage: {
              "gpt-4o-mini": {
                input: { tokens: 100, price: 0.001 },
                output_total: { tokens: 20, price: 0.002 },
              },
            },
          },
        },
      ],
      analysis: { call_successful: "success" },
    });
    const el = new ElevenLabsClient({ apiKey: "k", fetch });
    const res = await el.simulateConversation("agent_1", { x: 1 });

    const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://api.elevenlabs.io/v1/convai/agents/agent_1/simulate-conversation");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("k");

    expect(res.turns).toHaveLength(3); // empty tool-call turn dropped
    const last = res.turns[2];
    expect(last).toMatchObject({ index: 2, role: "agent", llmModel: "gpt-4o-mini" });
    expect(last.llmTtfbMs).toBeCloseTo(420);
    expect(last.ttsTtfbMs).toBeCloseTo(180);
    expect(last.llmInputTokens).toBe(100);
    expect(last.llmOutputTokens).toBe(20);
    expect(last.llmPriceUsd).toBeCloseTo(0.003);
    expect(res.raw).toBeTruthy();
  });

  it("parses conversation metadata cost fields", async () => {
    const el = new ElevenLabsClient({
      apiKey: "k",
      fetch: mockFetch(200, {
        conversation_id: "c1",
        agent_id: "a1",
        status: "done",
        has_audio: true,
        transcript: [{ role: "agent", message: "Hello", time_in_call_secs: 0 }],
        metadata: { call_duration_secs: 90, cost: 1000, cost_fiat: 0.15, charging: { llm_price: 0.01 } },
      }),
    });
    const c = await el.getConversation("c1");
    expect(c).toMatchObject({ durationSecs: 90, credits: 1000, costFiatUsd: 0.15, llmChargeUsd: 0.01, hasAudio: true });
  });

  it("rejects unexpected shapes with a descriptive error", async () => {
    const el = new ElevenLabsClient({ apiKey: "k", fetch: mockFetch(200, { nope: true }) });
    await expect(el.createAgent({})).rejects.toThrow(/Unexpected response shape/);
  });
});

describe("agent config", () => {
  it("builds snake_case agent body omitting unset params", () => {
    const body = buildAgentBody(variant, scenario);
    expect(body.name.startsWith("bench-v1-s2")).toBe(true);
    expect(body.conversation_config.agent.prompt).toEqual({
      prompt: scenario.systemPrompt,
      llm: "gpt-4o-mini",
      temperature: 0.3,
    });
    expect(body.conversation_config.tts).toEqual({
      model_id: "eleven_flash_v2_5",
      voice_id: "voice123",
      speed: 1.1,
    });
  });

  it("config hash is stable and changes with config", () => {
    expect(configHash(variant, scenario)).toBe(configHash({ ...variant, name: "renamed" }, scenario));
    expect(configHash(variant, scenario)).not.toBe(configHash({ ...variant, llm: "gpt-4o" }, scenario));
  });

  it("scripted simulation embeds script and bounds turns", () => {
    const body = buildSimulationBody(scenario);
    expect(body.new_turns_limit).toBe(6);
    expect(body.simulation_specification.simulated_user_config.prompt.prompt).toContain(
      "1. What are your hours?",
    );
  });
});

describe("incompatiblePairs", () => {
  const variants = [
    { id: 1, ttsModel: "eleven_flash_v2" },
    { id: 2, ttsModel: "eleven_flash_v2_5" },
  ];
  const scenarios = [
    { id: 10, language: "en" },
    { id: 11, language: "fr" },
    { id: 12, language: "es" },
  ];

  it("pairs English-only TTS models with non-English scenarios", () => {
    const pairs = incompatiblePairs(variants, scenarios).map((p) => [p.variant.id, p.scenario.id]);
    expect(pairs).toEqual([
      [1, 11],
      [1, 12],
    ]);
  });

  it("is empty when every scenario is English", () => {
    expect(incompatiblePairs(variants, [scenarios[0]])).toEqual([]);
  });
});
