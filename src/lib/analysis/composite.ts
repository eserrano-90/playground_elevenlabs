import type { ReadabilityFormula } from "./metrics";

/**
 * Composite complexity (0–100). Each metric is mapped onto a fixed reference range and
 * clamped, so scores are stable as runs complete and comparable across benchmarks.
 */
export const COMPOSITE_WEIGHTS = {
  avgWordsPerResponse: 0.2,
  avgSentenceLength: 0.2,
  readability: 0.25,
  lexicalDiversity: 0.15,
  judge: 0.2,
} as const;

export const COMPOSITE_RANGES = {
  avgWordsPerResponse: [5, 150],
  avgSentenceLength: [5, 30],
  fleschKincaidGrade: [0, 16],
  // Fernández-Huerta is an ease score: inverted so higher = more complex.
  fernandezHuertaEase: [100, 0],
  // Kandel–Moles (French) is also an ease score, inverted the same way.
  kandelMolesEase: [100, 0],
  lexicalDiversity: [0.3, 0.9],
  judge: [1, 5],
} as const;

export interface CompositeInput {
  avgWordsPerResponse: number;
  avgSentenceLength: number;
  readabilityGrade: number;
  readabilityFormula: ReadabilityFormula | string;
  lexicalDiversity: number;
  /** Mean of judge depth + coherence (1–5), when judge scoring ran. */
  judgeMean?: number | null;
}

function scale(v: number, [lo, hi]: readonly [number, number]): number {
  const t = (v - lo) / (hi - lo);
  return Math.min(1, Math.max(0, t));
}

export function compositeScore(m: CompositeInput): number {
  const W = COMPOSITE_WEIGHTS;
  const R = COMPOSITE_RANGES;
  const readabilityRange =
    m.readabilityFormula === "fernandez-huerta"
      ? R.fernandezHuertaEase
      : m.readabilityFormula === "kandel-moles"
        ? R.kandelMolesEase
        : R.fleschKincaidGrade;
  const parts: [number, number][] = [
    [scale(m.avgWordsPerResponse, R.avgWordsPerResponse), W.avgWordsPerResponse],
    [scale(m.avgSentenceLength, R.avgSentenceLength), W.avgSentenceLength],
    [scale(m.readabilityGrade, readabilityRange), W.readability],
    [scale(m.lexicalDiversity, R.lexicalDiversity), W.lexicalDiversity],
  ];
  if (m.judgeMean != null) parts.push([scale(m.judgeMean, R.judge), W.judge]);
  // Weights are renormalized when the judge is unavailable.
  const wsum = parts.reduce((a, [, w]) => a + w, 0);
  return (parts.reduce((a, [v, w]) => a + v * w, 0) / wsum) * 100;
}
