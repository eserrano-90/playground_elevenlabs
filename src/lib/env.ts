import "server-only";
import { z } from "zod";

const envSchema = z.object({
  ELEVENLABS_API_KEY: z.string().min(1, "ELEVENLABS_API_KEY is required"),
  DATABASE_PATH: z.string().default("./data/bench.db"),
  JUDGE_PROVIDER: z
    .enum(["anthropic", "openai", ""])
    .optional()
    .transform((v) => v || undefined),
  JUDGE_API_KEY: z.string().optional().transform((v) => v || undefined),
  JUDGE_MODEL: z.string().optional().transform((v) => v || undefined),
  ASSIST_MODEL: z.string().optional().transform((v) => v || undefined),
  BENCH_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(2),
  BENCH_MAX_RUNS: z.coerce.number().int().min(1).default(50),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validates process.env once. Throws with a readable message when required vars are missing. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function isJudgeConfigured(env: Env = getEnv()): boolean {
  return Boolean(env.JUDGE_PROVIDER && env.JUDGE_API_KEY && env.JUDGE_MODEL);
}
