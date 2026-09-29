import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { draftSchema, generateScenarioDraft, SCENARIO_WRITER_INSTRUCTION } from "./generate";

function mockModel(output: unknown) {
  const model = new MockLanguageModelV4({
    provider: "mock",
    modelId: "writer",
    doGenerate: {
      content: [{ type: "text", text: JSON.stringify(output) }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 20, text: 20, reasoning: 0 },
      },
      warnings: [],
    },
  });
  return { model, ref: { model, id: "mock/writer" } };
}

const base = { name: " Dental desk ", systemPrompt: " Personality: ... ", firstMessage: " Hi! " };
const input = { description: "front desk of a dental clinic that books cleanings", language: "en" };

function responseSchema(model: MockLanguageModelV4) {
  const format = model.doGenerateCalls[0].responseFormat;
  if (format?.type !== "json") throw new Error("expected json response format");
  return format.schema as { properties: Record<string, unknown> };
}

describe("draftSchema", () => {
  it("only includes the simulated-user field for the requested mode", () => {
    const keys = (s: z.ZodObject) => Object.keys(s.shape).sort();
    expect(keys(draftSchema({ userMode: "scripted", includeUser: true }))).toContain("scriptedTurns");
    expect(keys(draftSchema({ userMode: "scripted", includeUser: true }))).not.toContain("personaPrompt");
    expect(keys(draftSchema({ userMode: "persona", includeUser: true }))).toContain("personaPrompt");
    expect(keys(draftSchema({ userMode: "persona", includeUser: false }))).toEqual(["firstMessage", "name", "systemPrompt"]);
  });
});

describe("generateScenarioDraft", () => {
  it("returns a trimmed scripted draft and requests only scripted turns", async () => {
    const { model, ref } = mockModel({ ...base, scriptedTurns: [" Hi ", "", "a", "b", "c", "d", "e", "f"] });
    const res = await generateScenarioDraft({ ...input, userMode: "scripted", includeUser: true }, { model: ref });

    expect(res.model).toBe("mock/writer");
    expect(res.draft).toEqual({
      name: "Dental desk",
      systemPrompt: "Personality: ...",
      firstMessage: "Hi!",
      scriptedTurns: ["Hi", "a", "b", "c", "d", "e"],
    });
    const props = Object.keys(responseSchema(model).properties);
    expect(props).toContain("scriptedTurns");
    expect(props).not.toContain("personaPrompt");
  });

  it("returns a persona draft in persona mode", async () => {
    const { model, ref } = mockModel({ ...base, personaPrompt: " You are a patient. " });
    const res = await generateScenarioDraft({ ...input, userMode: "persona", includeUser: true }, { model: ref });

    expect(res.draft.personaPrompt).toBe("You are a patient.");
    expect(res.draft.scriptedTurns).toBeUndefined();
    expect(Object.keys(responseSchema(model).properties)).not.toContain("scriptedTurns");
  });

  it("passes the language and the writing instruction to the model", async () => {
    const { model, ref } = mockModel(base);
    await generateScenarioDraft({ ...input, language: "es", tone: "formal", includeUser: false }, { model: ref });

    const call = model.doGenerateCalls[0];
    const system = call.prompt.find((m) => m.role === "system");
    expect(system?.content).toBe(SCENARIO_WRITER_INSTRUCTION);
    const user = JSON.stringify(call.prompt.find((m) => m.role === "user"));
    expect(user).toContain("Language: Spanish");
    expect(user).toContain("Tone: formal");
    expect(user).toContain("<scenario_description>");
    expect(call.maxOutputTokens).toBe(1200);
  });

  it("asks for French when the language is fr", async () => {
    const { model, ref } = mockModel(base);
    await generateScenarioDraft({ ...input, language: "fr", includeUser: false }, { model: ref });
    expect(JSON.stringify(model.doGenerateCalls[0].prompt.find((m) => m.role === "user"))).toContain("Language: French");
  });

  it("rejects invalid input before calling the model", async () => {
    const { model, ref } = mockModel(base);
    await expect(generateScenarioDraft({ description: "short", language: "en" }, { model: ref })).rejects.toBeInstanceOf(
      z.ZodError,
    );
    await expect(generateScenarioDraft({ ...input, language: "de" }, { model: ref })).rejects.toBeInstanceOf(z.ZodError);
    expect(model.doGenerateCalls).toHaveLength(0);
  });
});
