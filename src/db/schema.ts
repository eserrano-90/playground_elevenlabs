import { sql } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

export const variants = sqliteTable("variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  llm: text("llm").notNull(),
  ttsModel: text("tts_model").notNull(),
  voiceId: text("voice_id").notNull(),
  voiceName: text("voice_name"),
  temperature: real("temperature"),
  maxTokens: integer("max_tokens"),
  stability: real("stability"),
  similarityBoost: real("similarity_boost"),
  speed: real("speed"),
  ...timestamps,
});

export const scenarios = sqliteTable("scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  firstMessage: text("first_message").notNull(),
  language: text("language").notNull().default("en"),
  userMode: text("user_mode", { enum: ["persona", "scripted"] }).notNull(),
  personaPrompt: text("persona_prompt"),
  scriptedTurns: text("scripted_turns", { mode: "json" }).$type<string[]>(),
  maxTurns: integer("max_turns").notNull().default(10),
  ...timestamps,
});

export const benchmarkStatuses = ["draft", "running", "completed", "cancelled"] as const;

export const benchmarks = sqliteTable("benchmarks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  status: text("status", { enum: benchmarkStatuses }).notNull().default("draft"),
  repetitions: integer("repetitions").notNull().default(1),
  judgeEnabled: integer("judge_enabled", { mode: "boolean" }).notNull().default(false),
  estimatedCostUsd: real("estimated_cost_usd"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  ...timestamps,
});

export const runStatuses = ["pending", "running", "completed", "failed", "cancelled"] as const;
export type RunStatus = (typeof runStatuses)[number];

export const runs = sqliteTable("runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Null for ad-hoc live runs that are not part of a benchmark.
  benchmarkId: integer("benchmark_id").references(() => benchmarks.id, { onDelete: "cascade" }),
  variantId: integer("variant_id")
    .notNull()
    .references(() => variants.id, { onDelete: "cascade" }),
  scenarioId: integer("scenario_id")
    .notNull()
    .references(() => scenarios.id, { onDelete: "cascade" }),
  repetition: integer("repetition").notNull().default(1),
  mode: text("mode", { enum: ["simulated", "live"] }).notNull(),
  status: text("status", { enum: runStatuses }).notNull().default("pending"),
  error: text("error"),
  agentId: text("agent_id"),
  conversationId: text("conversation_id"),
  attempts: integer("attempts").notNull().default(0),
  wallClockMs: integer("wall_clock_ms"),
  durationSecs: real("duration_secs"),
  durationSource: text("duration_source", { enum: ["reported", "estimated"] }),
  noOutput: integer("no_output", { mode: "boolean" }).notNull().default(false),
  hasAudio: integer("has_audio", { mode: "boolean" }).notNull().default(false),
  rawResponse: text("raw_response", { mode: "json" }).$type<unknown>(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  ...timestamps,
});

export const runTurns = sqliteTable("run_turns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: integer("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  index: integer("index").notNull(),
  role: text("role", { enum: ["agent", "user"] }).notNull(),
  message: text("message").notNull(),
  timeInCallSecs: real("time_in_call_secs"),
  llmTtfbMs: real("llm_ttfb_ms"),
  ttsTtfbMs: real("tts_ttfb_ms"),
  llmModel: text("llm_model"),
  llmInputTokens: integer("llm_input_tokens"),
  llmOutputTokens: integer("llm_output_tokens"),
  llmPriceUsd: real("llm_price_usd"),
});

export const runMetrics = sqliteTable("run_metrics", {
  runId: integer("run_id")
    .primaryKey()
    .references(() => runs.id, { onDelete: "cascade" }),
  agentTurns: integer("agent_turns"),
  avgWordsPerResponse: real("avg_words_per_response"),
  avgSentenceLength: real("avg_sentence_length"),
  readabilityGrade: real("readability_grade"),
  readabilityFormula: text("readability_formula"),
  lexicalDiversity: real("lexical_diversity"),
  totalAgentChars: integer("total_agent_chars"),
  compositeScore: real("composite_score"),
  latencyMeanMs: real("latency_mean_ms"),
  latencyP95Ms: real("latency_p95_ms"),
  llmInputTokens: integer("llm_input_tokens"),
  llmOutputTokens: integer("llm_output_tokens"),
  creditsUsed: real("credits_used"),
  costUsd: real("cost_usd"),
  costSource: text("cost_source", { enum: ["reported", "estimated"] }),
  costPerMinuteUsd: real("cost_per_minute_usd"),
  costPerTurnUsd: real("cost_per_turn_usd"),
  voiceCostUsd: real("voice_cost_usd"),
  llmCostUsd: real("llm_cost_usd"),
  computedAt: integer("computed_at", { mode: "timestamp" }).notNull(),
});

export type JudgeCriterion = "relevance" | "depth" | "coherence" | "adherence";

export const judgeScores = sqliteTable("judge_scores", {
  runId: integer("run_id")
    .primaryKey()
    .references(() => runs.id, { onDelete: "cascade" }),
  judgeModel: text("judge_model").notNull(),
  relevance: integer("relevance").notNull(),
  depth: integer("depth").notNull(),
  coherence: integer("coherence").notNull(),
  adherence: integer("adherence").notNull(),
  rationale: text("rationale", { mode: "json" }).$type<Record<JudgeCriterion, string>>().notNull(),
  createdAt: timestamps.createdAt,
});

/** Singleton row (id = 1) with platform-level pricing. */
export const pricingSettings = sqliteTable("pricing_settings", {
  id: integer("id").primaryKey(),
  usdPerCredit: real("usd_per_credit").notNull(),
  plan: text("plan").notNull(),
  agentUsdPerMinuteByPlan: text("agent_usd_per_minute_by_plan", { mode: "json" })
    .$type<Record<string, number>>()
    .notNull(),
  // Characters per second used to estimate spoken duration per TTS model.
  speechRateByTtsModel: text("speech_rate_by_tts_model", { mode: "json" })
    .$type<Record<string, number>>()
    .notNull(),
  updatedAt: timestamps.updatedAt,
});

/** LLMs supported by ElevenLabs Agents, with per-million-token prices. */
export const llmOptions = sqliteTable("llm_options", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  provider: text("provider").notNull(),
  inputUsdPerMTok: real("input_usd_per_mtok").notNull(),
  outputUsdPerMTok: real("output_usd_per_mtok").notNull(),
  updatedAt: timestamps.updatedAt,
});

export const agentsCache = sqliteTable(
  "agents_cache",
  {
    variantId: integer("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    scenarioId: integer("scenario_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),
    agentId: text("agent_id").notNull(),
    configHash: text("config_hash").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.variantId, t.scenarioId] })],
);

export type Variant = typeof variants.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type Benchmark = typeof benchmarks.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type RunTurn = typeof runTurns.$inferSelect;
export type RunMetrics = typeof runMetrics.$inferSelect;
export type JudgeScore = typeof judgeScores.$inferSelect;
export type PricingSettings = typeof pricingSettings.$inferSelect;
export type LlmOption = typeof llmOptions.$inferSelect;
