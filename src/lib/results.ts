import { stats, type Stats } from "@/lib/cost/aggregate";

/** Flat per-run row used by the dashboard and exports. */
export interface RunResultRow {
  runId: number;
  benchmarkId: number | null;
  mode: "simulated" | "live";
  status: string;
  repetition: number;
  error: string | null;
  variantId: number;
  variantName: string;
  llm: string;
  ttsModel: string;
  voiceId: string;
  voiceName: string | null;
  scenarioId: number;
  scenarioName: string;
  durationSecs: number | null;
  durationSource: string | null;
  wallClockMs: number | null;
  agentTurns: number | null;
  avgWordsPerResponse: number | null;
  avgSentenceLength: number | null;
  readabilityGrade: number | null;
  readabilityFormula: string | null;
  lexicalDiversity: number | null;
  compositeScore: number | null;
  latencyMeanMs: number | null;
  latencyP95Ms: number | null;
  llmInputTokens: number | null;
  llmOutputTokens: number | null;
  costUsd: number | null;
  costSource: string | null;
  costPerMinuteUsd: number | null;
  costPerTurnUsd: number | null;
  voiceCostUsd: number | null;
  llmCostUsd: number | null;
  judgeModel: string | null;
  judgeRelevance: number | null;
  judgeDepth: number | null;
  judgeCoherence: number | null;
  judgeAdherence: number | null;
}

export interface VariantAggregate {
  variantId: number;
  variantName: string;
  llm: string;
  ttsModel: string;
  voiceName: string | null;
  runs: number;
  latencyMeanMs: Stats;
  latencyP95Ms: Stats;
  compositeScore: Stats;
  judgeMean: Stats;
  costPerMinuteUsd: Stats;
  costUsd: Stats;
  avgWordsPerResponse: Stats;
  readabilityGrade: Stats;
  lexicalDiversity: Stats;
  /** True when any cost in the group is estimated rather than reported by ElevenLabs. */
  hasEstimatedCost: boolean;
}

export function judgeMeanOf(r: RunResultRow): number | null {
  const xs = [r.judgeRelevance, r.judgeDepth, r.judgeCoherence, r.judgeAdherence].filter(
    (v): v is number => v != null,
  );
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Aggregates completed runs per variant, optionally restricted to one scenario. */
export function aggregateByVariant(rows: RunResultRow[], scenarioId?: number | null): VariantAggregate[] {
  const groups = new Map<number, RunResultRow[]>();
  for (const r of rows) {
    if (r.status !== "completed") continue;
    if (scenarioId != null && r.scenarioId !== scenarioId) continue;
    const g = groups.get(r.variantId) ?? [];
    g.push(r);
    groups.set(r.variantId, g);
  }
  return [...groups.values()].map((g) => {
    const f = g[0];
    const pick = (k: keyof RunResultRow) => stats(g.map((r) => r[k] as number | null));
    return {
      variantId: f.variantId,
      variantName: f.variantName,
      llm: f.llm,
      ttsModel: f.ttsModel,
      voiceName: f.voiceName ?? f.voiceId,
      runs: g.length,
      latencyMeanMs: pick("latencyMeanMs"),
      latencyP95Ms: pick("latencyP95Ms"),
      compositeScore: pick("compositeScore"),
      judgeMean: stats(g.map(judgeMeanOf)),
      costPerMinuteUsd: pick("costPerMinuteUsd"),
      costUsd: pick("costUsd"),
      avgWordsPerResponse: pick("avgWordsPerResponse"),
      readabilityGrade: pick("readabilityGrade"),
      lexicalDiversity: pick("lexicalDiversity"),
      hasEstimatedCost: g.some((r) => r.costSource === "estimated"),
    };
  });
}

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "number" ? String(Number(v.toFixed(6))) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T extends object>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0 && !columns) return "";
  const cols = columns ?? (Object.keys(rows[0]) as (keyof T)[]);
  const lines = [cols.map((c) => csvCell(c)).join(",")];
  for (const r of rows) lines.push(cols.map((c) => csvCell(r[c])).join(","));
  return lines.join("\n") + "\n";
}

/** Flattens Stats into `<metric>_mean/min/max/std` columns for CSV export. */
export function flattenAggregate(a: VariantAggregate): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {
    variantId: a.variantId,
    variantName: a.variantName,
    llm: a.llm,
    ttsModel: a.ttsModel,
    voiceName: a.voiceName,
    runs: a.runs,
    hasEstimatedCost: a.hasEstimatedCost,
  };
  for (const [k, v] of Object.entries(a)) {
    if (v && typeof v === "object" && "mean" in v) {
      const s = v as Stats;
      out[`${k}_mean`] = s.mean;
      out[`${k}_min`] = s.min;
      out[`${k}_max`] = s.max;
      out[`${k}_std`] = s.std;
    }
  }
  return out;
}
