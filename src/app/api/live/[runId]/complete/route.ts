import { z } from "zod";
import { getDb } from "@/db/client";
import { handle, intParam, parseBody } from "@/lib/api";
import { getEnv, isJudgeConfigured } from "@/lib/env";
import { getElevenLabs } from "@/lib/elevenlabs";
import { judgeTranscript } from "@/lib/analysis/judge";
import { completeLiveRun, failLiveRun } from "@/lib/services/live";

const schema = z.union([
  z.object({ conversationId: z.string().min(1), judge: z.boolean().default(false) }),
  z.object({ error: z.string().min(1) }),
]);

/** Called by the live page when the session ends: fetch the conversation, or record why it failed. */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/live/[runId]/complete">) => {
  const db = getDb();
  const runId = intParam((await ctx.params).runId);
  const body = await parseBody(req, schema);
  if ("error" in body) {
    failLiveRun(db, runId, body.error);
    return { runId, status: "failed" };
  }
  await completeLiveRun(db, getElevenLabs(), runId, body.conversationId, {
    judge: body.judge && isJudgeConfigured(getEnv()) ? judgeTranscript : undefined,
  });
  return { runId, status: "completed" };
});
