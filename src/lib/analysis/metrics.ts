import { sentences, syllables, words } from "./text";

export type ReadabilityFormula = "flesch-kincaid-grade" | "fernandez-huerta" | "kandel-moles";

export interface ComplexityMetrics {
  agentTurns: number;
  avgWordsPerResponse: number;
  avgSentenceLength: number;
  readabilityGrade: number;
  readabilityFormula: ReadabilityFormula;
  lexicalDiversity: number;
  totalAgentChars: number;
}

export const MATTR_WINDOW = 50;

/** Moving-average type-token ratio; plain TTR when shorter than the window. */
export function mattr(tokens: string[], window = MATTR_WINDOW): number {
  const lower = tokens.map((t) => t.toLowerCase());
  if (lower.length === 0) return 0;
  if (lower.length <= window) return new Set(lower).size / lower.length;
  let total = 0;
  const counts = new Map<string, number>();
  for (let i = 0; i < window; i++) counts.set(lower[i], (counts.get(lower[i]) ?? 0) + 1);
  total += counts.size / window;
  for (let i = window; i < lower.length; i++) {
    const out = lower[i - window];
    const c = counts.get(out)! - 1;
    if (c === 0) counts.delete(out);
    else counts.set(out, c);
    counts.set(lower[i], (counts.get(lower[i]) ?? 0) + 1);
    total += counts.size / window;
  }
  return total / (lower.length - window + 1);
}

export function readability(text: string, language: string): { value: number; formula: ReadabilityFormula } {
  const ws = words(text);
  const ss = Math.max(1, sentences(text).length);
  const syl = ws.reduce((n, w) => n + syllables(w, language), 0);
  const nw = Math.max(1, ws.length);
  const formula = READABILITY_FORMULAS[language.slice(0, 2).toLowerCase()] ?? "flesch-kincaid-grade";
  return { value: READABILITY[formula](nw, ss, syl), formula };
}

const READABILITY_FORMULAS: Record<string, ReadabilityFormula> = {
  en: "flesch-kincaid-grade",
  es: "fernandez-huerta",
  fr: "kandel-moles",
};

const READABILITY: Record<ReadabilityFormula, (words: number, sentences: number, syllables: number) => number> = {
  // US school grade level (higher = harder).
  "flesch-kincaid-grade": (w, s, syl) => 0.39 * (w / s) + 11.8 * (syl / w) - 15.59,
  // Spanish reading ease (0–100, higher = easier).
  "fernandez-huerta": (w, s, syl) => 206.84 - 0.6 * ((syl / w) * 100) - 1.02 * ((s / w) * 100),
  // French adaptation of Flesch reading ease (0–100, higher = easier).
  "kandel-moles": (w, s, syl) => 207 - 1.015 * (w / s) - 73.6 * (syl / w),
};

/**
 * Metrics are computed over the aggregated agent text of a run (readability formulas are
 * unreliable on very short individual turns). Returns null when there is no agent output.
 */
export function computeComplexity(agentMessages: string[], language: string): ComplexityMetrics | null {
  const msgs = agentMessages.map((m) => m.trim()).filter((m) => words(m).length > 0);
  if (msgs.length === 0) return null;
  const all = msgs.join("\n");
  const ws = words(all);
  const sentenceCount = msgs.reduce((n, m) => n + Math.max(1, sentences(m).length), 0);
  const r = readability(all, language);
  return {
    agentTurns: msgs.length,
    avgWordsPerResponse: ws.length / msgs.length,
    avgSentenceLength: ws.length / sentenceCount,
    readabilityGrade: r.value,
    readabilityFormula: r.formula,
    lexicalDiversity: mattr(ws),
    totalAgentChars: msgs.reduce((n, m) => n + m.length, 0),
  };
}
