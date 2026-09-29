import { describe, expect, it } from "vitest";
import { computeComplexity, mattr, readability } from "./metrics";
import { sentences, syllables, syllablesEn, syllablesEs, syllablesFr, words } from "./text";
import { compositeScore } from "./composite";

describe("text utilities", () => {
  it("tokenizes words and sentences", () => {
    expect(words("Hello, world! It's 9am.")).toEqual(["Hello", "world", "It's", "9am"]);
    expect(sentences("Hi there. How are you? Fine!")).toHaveLength(3);
    expect(sentences("no punctuation here")).toHaveLength(1);
  });

  it("counts English syllables", () => {
    expect(syllablesEn("cat")).toBe(1);
    expect(syllablesEn("table")).toBe(2);
    expect(syllablesEn("computer")).toBe(3);
    expect(syllablesEn("beautiful")).toBe(3);
  });

  it("counts Spanish syllables with diphthongs and hiatos", () => {
    expect(syllablesEs("casa")).toBe(2);
    expect(syllablesEs("puerta")).toBe(2); // ue diphthong
    expect(syllablesEs("teatro")).toBe(3); // e-a hiato
    expect(syllablesEs("país")).toBe(2); // accented í breaks diphthong
    expect(syllablesEs("ciudad")).toBe(2);
  });
});

describe("French syllables", () => {
  it("counts vowel groups and drops a final silent e/es", () => {
    expect(syllablesFr("bonjour")).toBe(2);
    expect(syllablesFr("maison")).toBe(2);
    expect(syllablesFr("rendez-vous")).toBe(3);
    expect(syllablesFr("école")).toBe(2);
    expect(syllablesFr("pâtes")).toBe(1);
    expect(syllablesFr("année")).toBe(2); // é is voiced, not silent
    expect(syllablesFr("oui")).toBe(1);
    expect(syllablesFr("le")).toBe(1);
  });

  it("routes by language", () => {
    expect(syllables("école", "fr")).toBe(2);
    expect(syllables("école", "fr-FR")).toBe(syllablesFr("école"));
    expect(syllables("casa", "es")).toBe(syllablesEs("casa"));
    expect(syllables("table", "en")).toBe(syllablesEn("table"));
  });
});

describe("metrics", () => {
  it("MATTR equals TTR for short texts and is bounded", () => {
    expect(mattr(["a", "b", "a", "b"])).toBe(0.5);
    const long = Array.from({ length: 200 }, (_, i) => `w${i % 25}`);
    const v = mattr(long);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(0.5);
  });

  it("Flesch-Kincaid grade rises with complexity", () => {
    const easy = readability("The cat sat. The dog ran. We had fun.", "en");
    const hard = readability(
      "Comprehensive infrastructural modernization necessitates considerable organizational commitment and interdepartmental coordination.",
      "en",
    );
    expect(easy.formula).toBe("flesch-kincaid-grade");
    expect(hard.value).toBeGreaterThan(easy.value + 10);
  });

  it("uses Fernández-Huerta for Spanish (higher = easier)", () => {
    const easy = readability("El gato come. El perro corre.", "es");
    const hard = readability(
      "La implementación de infraestructuras tecnológicas interdepartamentales requiere planificación estratégica considerable.",
      "es",
    );
    expect(easy.formula).toBe("fernandez-huerta");
    expect(easy.value).toBeGreaterThan(hard.value);
  });

  it("computes per-run complexity from agent messages", () => {
    const m = computeComplexity(["Hello there. How can I help?", "We open at nine."], "en")!;
    expect(m.agentTurns).toBe(2);
    expect(m.avgWordsPerResponse).toBe(5);
    expect(m.avgSentenceLength).toBeCloseTo(10 / 3);
    expect(m.totalAgentChars).toBe(44);
  });

  it("returns null when there is no agent output", () => {
    expect(computeComplexity([], "en")).toBeNull();
    expect(computeComplexity(["   ", "..."], "en")).toBeNull();
  });
});

describe("readability formula selection", () => {
  it("picks the formula by scenario language", () => {
    expect(readability("Hola a todos.", "es").formula).toBe("fernandez-huerta");
    expect(readability("Bonjour à tous.", "fr").formula).toBe("kandel-moles");
    expect(readability("Hello all.", "en").formula).toBe("flesch-kincaid-grade");
    expect(readability("Hallo zusammen.", "de").formula).toBe("flesch-kincaid-grade");
  });

  it("Kandel–Moles scores easier French text higher", () => {
    const easy = readability("Le chat dort. Il fait beau. On va au parc.", "fr");
    const hard = readability(
      "Conformément aux dispositions réglementaires applicables, l'établissement hospitalier procédera ultérieurement à la vérification approfondie des informations administratives communiquées.",
      "fr",
    );
    expect(easy.value).toBeGreaterThan(hard.value);
  });
});

describe("composite score", () => {
  const simple = {
    avgWordsPerResponse: 8,
    avgSentenceLength: 6,
    readabilityGrade: 2,
    readabilityFormula: "flesch-kincaid-grade",
    lexicalDiversity: 0.4,
  };
  const rich = {
    avgWordsPerResponse: 90,
    avgSentenceLength: 22,
    readabilityGrade: 12,
    readabilityFormula: "flesch-kincaid-grade",
    lexicalDiversity: 0.8,
  };

  it("is within 0–100 and orders simple < rich", () => {
    const a = compositeScore(simple);
    const b = compositeScore(rich);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(100);
    expect(b).toBeGreaterThan(a);
  });

  it("clamps out-of-range values and includes judge when present", () => {
    expect(compositeScore({ ...rich, avgWordsPerResponse: 10_000, avgSentenceLength: 999, readabilityGrade: 99, lexicalDiversity: 1 })).toBe(100);
    expect(compositeScore({ ...simple, judgeMean: 5 })).toBeGreaterThan(compositeScore(simple));
  });

  it("inverts Kandel–Moles ease so harder French text scores higher", () => {
    const fr = { ...simple, readabilityFormula: "kandel-moles" };
    expect(compositeScore({ ...fr, readabilityGrade: 20 })).toBeGreaterThan(compositeScore({ ...fr, readabilityGrade: 90 }));
  });
});
