import { describe, expect, it } from "vitest";
import { isLocale, matchAcceptLanguage } from "./config";

describe("matchAcceptLanguage", () => {
  it("maps regional tags to their primary language", () => {
    expect(matchAcceptLanguage("es-MX,es;q=0.9,en;q=0.8")).toBe("es");
    expect(matchAcceptLanguage("fr-CA")).toBe("fr");
  });

  it("falls back to English for unsupported or missing languages", () => {
    expect(matchAcceptLanguage("de-DE,de;q=0.9")).toBe("en");
    expect(matchAcceptLanguage("")).toBe("en");
    expect(matchAcceptLanguage(null)).toBe("en");
  });

  it("respects quality ordering and skips q=0", () => {
    expect(matchAcceptLanguage("en;q=0.5,fr;q=0.9")).toBe("fr");
    expect(matchAcceptLanguage("de,es;q=0.3,fr;q=0.7")).toBe("fr");
    expect(matchAcceptLanguage("fr;q=0,es;q=0.1")).toBe("es");
  });
});

describe("isLocale", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
