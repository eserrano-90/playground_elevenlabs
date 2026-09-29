import { describe, expect, it } from "vitest";
import { generateInputSchema, scenarioInputSchema } from "./validation";

const scenario = {
  name: "Desk",
  systemPrompt: "You are a receptionist.",
  firstMessage: "Hello!",
  userMode: "scripted",
  scriptedTurns: ["Hi"],
  maxTurns: 6,
};

describe("scenario language", () => {
  it("accepts en, es and fr", () => {
    for (const language of ["en", "es", "fr"]) {
      expect(scenarioInputSchema.safeParse({ ...scenario, language }).success).toBe(true);
    }
  });

  it("rejects unsupported languages", () => {
    expect(scenarioInputSchema.safeParse({ ...scenario, language: "de" }).success).toBe(false);
  });

  it("accepts fr for generation", () => {
    const res = generateInputSchema.safeParse({ description: "front desk of a dental clinic", language: "fr" });
    expect(res.success).toBe(true);
  });
});
