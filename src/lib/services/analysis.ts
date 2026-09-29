import { and, asc, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { judgeScores, runMetrics, runs, runTurns, scenarios, variants } from "@/db/schema";
import { computeComplexity } from "@/lib/analysis/metrics";
import { compositeScore } from "@/lib/analysis/composite";
import { computeRunCost } from "@/lib/cost/cost";
import { percentile } from "@/lib/cost/aggregate";
import { getLlmPrice, getPricing } from "./pricing";

export type JudgeFn = (
  systemPrompt: string,
  turns: { role: string; message: string }[],
) => Promise<{
  judgeModel: string;
  output: Record<"relevance" | "depth" | "coherence" | "adherence", { score: number; rationale: string }>;
}>;

export interface AnalyzeOptions {
  /** Present only when judge scoring is enabled and configured. */
  judge?: JudgeFn;
  /** Re-use a stored judge score instead of calling the judge again. Stored scores are always used when no judge is passed. */
  reuseJudge?: boolean;
}

/** Per-turn response latency: LLM TTFB + TTS TTFB (whichever are reported). */
export function turnLatencyMs(t: { llmTtfbMs: number | null; ttsTtfbMs: number | null }): number | null {
  if (t.llmTtfbMs == null && t.ttsTtfbMs == null) return null;
  return (t.llmTtfbMs ?? 0) + (t.ttsTtfbMs ?? 0);
}

/**
 * Computes and stores deterministic complexity, latency, cost and (optionally) judge
 * metrics for a completed run from its stored transcript. Safe to call repeatedly.
 */
export async function analyzeRun(db: DB, runId: number, opts: AnalyzeOptions = {}) {
  const run = db.select().from(runs).where(eq(runs.id, runId)).get();
  if (!run || run.status !== "completed") return null;
  const variant = db.select().from(variants).where(eq(variants.id, run.variantId)).get()!;
  const scenario = db.select().from(scenarios).where(eq(scenarios.id, run.scenarioId)).get()!;
  const turns = db.select().from(runTurns).where(eq(runTurns.runId, runId)).orderBy(asc(runTurns.index)).all();
  const agentTurns = turns.filter((t) => t.role === "agent");

  const complexity = computeComplexity(
    agentTurns.map((t) => t.message),
    scenario.language,
  );
  db.update(runs).set({ noOutput: complexity === null }).where(eq(runs.id, runId)).run();

  const latencies = agentTurns.map(turnLatencyMs).filter((v): v is number => v != null);
  const latencyMeanMs = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;
  const latencyP95Ms = percentile(latencies, 95);

  const pricing = getPricing(db);
  const llm = getLlmPrice(db, variant.llm);
  const reported = extractReportedCost(run.rawResponse);
  const cost = computeRunCost(
    { durationSecs: run.durationSecs, ttsModel: variant.ttsModel, turns, ...reported },
    pricing,
    llm,
  );

  let judgeMean: number | null = null;
  if (complexity) {
    const existing = db.select().from(judgeScores).where(eq(judgeScores.runId, runId)).get();
    if (existing && (opts.reuseJudge || !opts.judge)) {
      judgeMean = (existing.depth + existing.coherence) / 2;
    } else if (opts.judge) {
      try {
        const { judgeModel, output } = await opts.judge(scenario.systemPrompt, turns);
        const score = {
          runId,
          judgeModel,
          relevance: output.relevance.score,
          depth: output.depth.score,
          coherence: output.coherence.score,
          adherence: output.adherence.score,
          rationale: {
            relevance: output.relevance.rationale,
            depth: output.depth.rationale,
            coherence: output.coherence.rationale,
            adherence: output.adherence.rationale,
          },
        };
        db.insert(judgeScores).values(score).onConflictDoUpdate({ target: judgeScores.runId, set: score }).run();
        judgeMean = (score.depth + score.coherence) / 2;
      } catch (err) {
        // Judge failures must not fail the run; deterministic metrics still apply.
        console.warn(`[bench] Judge failed for run ${runId}:`, err);
      }
    }
  }

  const row = {
    runId,
    agentTurns: complexity?.agentTurns ?? 0,
    avgWordsPerResponse: complexity?.avgWordsPerResponse ?? null,
    avgSentenceLength: complexity?.avgSentenceLength ?? null,
    readabilityGrade: complexity?.readabilityGrade ?? null,
    readabilityFormula: complexity?.readabilityFormula ?? null,
    lexicalDiversity: complexity?.lexicalDiversity ?? null,
    totalAgentChars: complexity?.totalAgentChars ?? 0,
    compositeScore: complexity ? compositeScore({ ...complexity, judgeMean }) : null,
    latencyMeanMs,
    latencyP95Ms,
    llmInputTokens: cost.llmInputTokens,
    llmOutputTokens: cost.llmOutputTokens,
    creditsUsed: cost.creditsUsed,
    costUsd: cost.costUsd,
    costSource: cost.costSource,
    costPerMinuteUsd: cost.costPerMinuteUsd,
    costPerTurnUsd: cost.costPerTurnUsd,
    voiceCostUsd: cost.voiceCostUsd,
    llmCostUsd: cost.llmCostUsd,
    computedAt: new Date(),
  };
  db.insert(runMetrics).values(row).onConflictDoUpdate({ target: runMetrics.runId, set: row }).run();
  return row;
}

/** Live runs store the conversation payload; pull ElevenLabs-reported cost fields from it. */
export function extractReportedCost(raw: unknown): {
  reportedCostFiatUsd: number | null;
  reportedCredits: number | null;
  reportedLlmChargeUsd: number | null;
} {
  const meta = (raw as { metadata?: Record<string, unknown> } | null)?.metadata;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const charging = meta?.charging as Record<string, unknown> | undefined;
  return {
    reportedCostFiatUsd: num(meta?.cost_fiat),
    reportedCredits: num(meta?.cost),
    reportedLlmChargeUsd: num(charging?.llm_price),
  };
}

/** Recomputes metrics for every completed run of a benchmark from stored transcripts. */
export async function reanalyzeBenchmark(
  db: DB,
  benchmarkId: number,
  opts: { judge?: JudgeFn; rescoreJudge?: boolean } = {},
) {
  const completed = db
    .select({ id: runs.id })
    .from(runs)
    .where(and(eq(runs.benchmarkId, benchmarkId), eq(runs.status, "completed")))
    .all();
  for (const r of completed) {
    await analyzeRun(db, r.id, { judge: opts.judge, reuseJudge: !opts.rescoreJudge });
  }
  return { reanalyzed: completed.length };
}
