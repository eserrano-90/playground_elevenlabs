import { and, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { runs, runTurns } from "@/db/schema";
import type { ElevenLabsClient } from "@/lib/elevenlabs/client";
import { ensureAgent } from "@/lib/elevenlabs/provisioning";
import { analyzeRun, type JudgeFn } from "./analysis";
import { getScenario, getVariant } from "./config";

export class NotFoundError extends Error {}

export async function startLiveSession(db: DB, el: ElevenLabsClient, variantId: number, scenarioId: number) {
  const variant = getVariant(db, variantId);
  const scenario = getScenario(db, scenarioId);
  if (!variant || !scenario) throw new NotFoundError("Variant or scenario not found");
  const { agentId } = await ensureAgent(db, el, variant, scenario);
  const { token } = await el.getConversationToken(agentId);
  const run = db
    .insert(runs)
    .values({ variantId, scenarioId, mode: "live", status: "running", agentId, startedAt: new Date(), attempts: 1 })
    .returning()
    .get();
  return { runId: run.id, token, agentId };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Called when the browser session ends. ElevenLabs finalizes conversations asynchronously,
 * so poll until the conversation leaves the in-progress/processing states.
 */
export async function completeLiveRun(
  db: DB,
  el: ElevenLabsClient,
  runId: number,
  conversationId: string,
  opts: { judge?: JudgeFn; pollIntervalMs?: number; maxPolls?: number } = {},
) {
  const run = db.select().from(runs).where(eq(runs.id, runId)).get();
  if (!run || run.mode !== "live") throw new NotFoundError("Live run not found");
  db.update(runs).set({ conversationId }).where(eq(runs.id, runId)).run();

  try {
    let convo = await el.getConversation(conversationId);
    for (let i = 0; i < (opts.maxPolls ?? 15) && !["done", "failed"].includes(convo.status); i++) {
      await sleep(opts.pollIntervalMs ?? 2000);
      convo = await el.getConversation(conversationId);
    }

    db.transaction((tx) => {
      tx.delete(runTurns).where(eq(runTurns.runId, runId)).run();
      if (convo.turns.length) tx.insert(runTurns).values(convo.turns.map((t) => ({ ...t, runId }))).run();
      tx.update(runs)
        .set({
          status: "completed",
          rawResponse: convo.raw,
          hasAudio: convo.hasAudio,
          durationSecs: convo.durationSecs,
          durationSource: convo.durationSecs != null ? "reported" : null,
          wallClockMs: run.startedAt ? Date.now() - run.startedAt.getTime() : null,
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(runs.id, runId))
        .run();
    });
    await analyzeRun(db, runId, { judge: opts.judge });
  } catch (err) {
    db.update(runs)
      .set({ status: "failed", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
      .where(eq(runs.id, runId))
      .run();
    throw err;
  }
  return db.select().from(runs).where(eq(runs.id, runId)).get()!;
}

/** Marks a live run failed when the browser session never produced a conversation. */
export function failLiveRun(db: DB, runId: number, error: string) {
  const res = db
    .update(runs)
    .set({ status: "failed", error, finishedAt: new Date() })
    .where(and(eq(runs.id, runId), eq(runs.mode, "live"), eq(runs.status, "running")))
    .run();
  if (res.changes === 0) throw new NotFoundError("Running live run not found");
}
