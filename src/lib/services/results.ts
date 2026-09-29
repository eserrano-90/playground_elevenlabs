import { asc, eq, type SQL } from "drizzle-orm";
import type { DB } from "@/db/client";
import { judgeScores, runMetrics, runs, runTurns, scenarios, variants } from "@/db/schema";
import type { RunResultRow } from "@/lib/results";

function selectRows(db: DB, where: SQL) {
  return db
    .select({
      runId: runs.id,
      benchmarkId: runs.benchmarkId,
      mode: runs.mode,
      status: runs.status,
      repetition: runs.repetition,
      error: runs.error,
      variantId: variants.id,
      variantName: variants.name,
      llm: variants.llm,
      ttsModel: variants.ttsModel,
      voiceId: variants.voiceId,
      voiceName: variants.voiceName,
      scenarioId: scenarios.id,
      scenarioName: scenarios.name,
      durationSecs: runs.durationSecs,
      durationSource: runs.durationSource,
      wallClockMs: runs.wallClockMs,
      agentTurns: runMetrics.agentTurns,
      avgWordsPerResponse: runMetrics.avgWordsPerResponse,
      avgSentenceLength: runMetrics.avgSentenceLength,
      readabilityGrade: runMetrics.readabilityGrade,
      readabilityFormula: runMetrics.readabilityFormula,
      lexicalDiversity: runMetrics.lexicalDiversity,
      compositeScore: runMetrics.compositeScore,
      latencyMeanMs: runMetrics.latencyMeanMs,
      latencyP95Ms: runMetrics.latencyP95Ms,
      llmInputTokens: runMetrics.llmInputTokens,
      llmOutputTokens: runMetrics.llmOutputTokens,
      costUsd: runMetrics.costUsd,
      costSource: runMetrics.costSource,
      costPerMinuteUsd: runMetrics.costPerMinuteUsd,
      costPerTurnUsd: runMetrics.costPerTurnUsd,
      voiceCostUsd: runMetrics.voiceCostUsd,
      llmCostUsd: runMetrics.llmCostUsd,
      judgeModel: judgeScores.judgeModel,
      judgeRelevance: judgeScores.relevance,
      judgeDepth: judgeScores.depth,
      judgeCoherence: judgeScores.coherence,
      judgeAdherence: judgeScores.adherence,
    })
    .from(runs)
    .innerJoin(variants, eq(variants.id, runs.variantId))
    .innerJoin(scenarios, eq(scenarios.id, runs.scenarioId))
    .leftJoin(runMetrics, eq(runMetrics.runId, runs.id))
    .leftJoin(judgeScores, eq(judgeScores.runId, runs.id))
    .where(where)
    .orderBy(asc(runs.id))
    .all() satisfies RunResultRow[];
}

export function getBenchmarkResultRows(db: DB, benchmarkId: number): RunResultRow[] {
  return selectRows(db, eq(runs.benchmarkId, benchmarkId));
}

export function getLiveResultRows(db: DB): RunResultRow[] {
  return selectRows(db, eq(runs.mode, "live"));
}

export function getRunDetail(db: DB, runId: number) {
  const [row] = selectRows(db, eq(runs.id, runId));
  if (!row) return null;
  const turns = db.select().from(runTurns).where(eq(runTurns.runId, runId)).orderBy(asc(runTurns.index)).all();
  const judge = db.select().from(judgeScores).where(eq(judgeScores.runId, runId)).get() ?? null;
  const run = db
    .select({ hasAudio: runs.hasAudio, conversationId: runs.conversationId, noOutput: runs.noOutput, agentId: runs.agentId })
    .from(runs)
    .where(eq(runs.id, runId))
    .get()!;
  return { row, turns, judge, ...run };
}

/** Transcripts for a scenario keyed by variant, for side-by-side comparison. */
export function getComparisonTranscripts(db: DB, benchmarkId: number, scenarioId: number, variantIds: number[]) {
  const rows = getBenchmarkResultRows(db, benchmarkId).filter(
    (r) => r.scenarioId === scenarioId && variantIds.includes(r.variantId) && r.status === "completed",
  );
  // First completed repetition per variant.
  const chosen = new Map<number, RunResultRow>();
  for (const r of rows) if (!chosen.has(r.variantId)) chosen.set(r.variantId, r);
  return [...chosen.values()].map((r) => ({
    variantId: r.variantId,
    variantName: r.variantName,
    runId: r.runId,
    turns: db
      .select({ index: runTurns.index, role: runTurns.role, message: runTurns.message, llmTtfbMs: runTurns.llmTtfbMs, ttsTtfbMs: runTurns.ttsTtfbMs })
      .from(runTurns)
      .where(eq(runTurns.runId, r.runId))
      .orderBy(asc(runTurns.index))
      .all(),
  }));
}
