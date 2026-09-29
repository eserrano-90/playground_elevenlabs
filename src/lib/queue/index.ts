import "server-only";
import { getDb } from "@/db/client";
import { getEnv, isJudgeConfigured } from "@/lib/env";
import { getElevenLabs } from "@/lib/elevenlabs";
import { judgeTranscript } from "@/lib/analysis/judge";
import { createRunner, type Runner } from "./runner";

const g = globalThis as unknown as { __benchRunner?: Runner };

/** Process-wide runner; survives Next.js dev hot reloads so queued work is not duplicated. */
export function getRunner(): Runner {
  if (!g.__benchRunner) {
    const env = getEnv();
    g.__benchRunner = createRunner({
      db: getDb(),
      el: getElevenLabs(),
      concurrency: env.BENCH_CONCURRENCY,
      judgeFor: (enabled) => (enabled && isJudgeConfigured(env) ? judgeTranscript : undefined),
    });
  }
  return g.__benchRunner;
}
