export interface PricingInput {
  usdPerCredit: number;
  plan: string;
  agentUsdPerMinuteByPlan: Record<string, number>;
  speechRateByTtsModel: Record<string, number>;
}

export interface LlmPrice {
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
}

export type CostSource = "reported" | "estimated";

export interface TurnUsage {
  role: "agent" | "user";
  message: string;
  llmInputTokens: number | null;
  llmOutputTokens: number | null;
  llmPriceUsd: number | null;
}

export interface RunCostInput {
  durationSecs: number | null;
  ttsModel: string;
  turns: TurnUsage[];
  /** From conversation metadata, when ElevenLabs reports it (live runs). */
  reportedCostFiatUsd?: number | null;
  reportedCredits?: number | null;
  reportedLlmChargeUsd?: number | null;
}

export interface RunCost {
  costUsd: number;
  costSource: CostSource;
  voiceCostUsd: number;
  llmCostUsd: number;
  llmInputTokens: number;
  llmOutputTokens: number;
  creditsUsed: number | null;
  costPerMinuteUsd: number | null;
  costPerTurnUsd: number | null;
}

/** Rough tokens-per-character ratio used only when ElevenLabs reports no token usage. */
const CHARS_PER_TOKEN = 4;

export function agentUsdPerMinute(pricing: PricingInput): number {
  return pricing.agentUsdPerMinuteByPlan[pricing.plan] ?? Object.values(pricing.agentUsdPerMinuteByPlan)[0] ?? 0;
}

export function speechRate(pricing: PricingInput, ttsModel: string): number {
  return pricing.speechRateByTtsModel[ttsModel] ?? pricing.speechRateByTtsModel.default ?? 15;
}

/** Spoken duration estimate for runs without audio: all turns are voiced at the TTS rate. */
export function estimateDurationSecs(
  turns: Pick<TurnUsage, "message">[],
  pricing: PricingInput,
  ttsModel: string,
): number {
  const chars = turns.reduce((n, t) => n + t.message.length, 0);
  return chars / speechRate(pricing, ttsModel);
}

export function llmCostFromTokens(input: number, output: number, price: LlmPrice): number {
  return (input * price.inputUsdPerMTok + output * price.outputUsdPerMTok) / 1_000_000;
}

/**
 * Cost resolution order:
 * 1. `cost_fiat` (USD) reported by ElevenLabs → whole conversation is `reported`.
 * 2. Reported credits × USD/credit → `reported`.
 * 3. Otherwise voice/platform cost = minutes × plan rate → `estimated`.
 * LLM cost prefers the reported charge, then per-turn prices, then tokens × price table.
 */
export function computeRunCost(input: RunCostInput, pricing: PricingInput, llmPrice: LlmPrice | null): RunCost {
  const agentTurns = input.turns.filter((t) => t.role === "agent");
  const inTok = sum(agentTurns.map((t) => t.llmInputTokens ?? 0));
  const outTok = sum(agentTurns.map((t) => t.llmOutputTokens ?? 0));
  const perTurnPrice = sum(agentTurns.map((t) => t.llmPriceUsd ?? 0));

  let llmCost: number;
  if (input.reportedLlmChargeUsd != null) llmCost = input.reportedLlmChargeUsd;
  else if (perTurnPrice > 0) llmCost = perTurnPrice;
  else if (llmPrice && inTok + outTok > 0) llmCost = llmCostFromTokens(inTok, outTok, llmPrice);
  else if (llmPrice) {
    const outChars = sum(agentTurns.map((t) => t.message.length));
    const allChars = sum(input.turns.map((t) => t.message.length));
    llmCost = llmCostFromTokens(allChars / CHARS_PER_TOKEN, outChars / CHARS_PER_TOKEN, llmPrice);
  } else llmCost = 0;

  const duration = input.durationSecs ?? 0;
  let total: number;
  let voice: number;
  let source: CostSource;
  if (input.reportedCostFiatUsd != null) {
    total = input.reportedCostFiatUsd;
    voice = Math.max(0, total - llmCost);
    source = "reported";
  } else if (input.reportedCredits != null) {
    total = input.reportedCredits * pricing.usdPerCredit + (input.reportedLlmChargeUsd != null ? 0 : llmCost);
    voice = Math.max(0, total - llmCost);
    source = "reported";
  } else {
    voice = (duration / 60) * agentUsdPerMinute(pricing);
    total = voice + llmCost;
    source = "estimated";
  }

  return {
    costUsd: total,
    costSource: source,
    voiceCostUsd: voice,
    llmCostUsd: llmCost,
    llmInputTokens: inTok,
    llmOutputTokens: outTok,
    creditsUsed: input.reportedCredits ?? null,
    costPerMinuteUsd: costPerMinute(total, duration),
    costPerTurnUsd: agentTurns.length > 0 ? total / agentTurns.length : null,
  };
}

/** Null when the duration is zero/unknown instead of dividing by zero. */
export function costPerMinute(totalUsd: number, durationSecs: number | null): number | null {
  if (!durationSecs || durationSecs <= 0) return null;
  return totalUsd / (durationSecs / 60);
}

/** Assumptions used for the pre-run estimate (no transcript exists yet). */
export const ESTIMATE_ASSUMPTIONS = {
  agentCharsPerTurn: 350,
  userCharsPerTurn: 120,
  outputTokensPerTurn: 90,
  historyTokensPerTurn: 120,
} as const;

export function estimateRunCostBeforeStart(
  opts: { systemPrompt: string; maxTurns: number; ttsModel: string },
  pricing: PricingInput,
  llmPrice: LlmPrice | null,
): number {
  const a = ESTIMATE_ASSUMPTIONS;
  const agentTurns = Math.ceil(opts.maxTurns / 2);
  const userTurns = Math.floor(opts.maxTurns / 2);
  const chars = agentTurns * a.agentCharsPerTurn + userTurns * a.userCharsPerTurn;
  const minutes = chars / speechRate(pricing, opts.ttsModel) / 60;
  const promptTokens = opts.systemPrompt.length / CHARS_PER_TOKEN;
  let inputTokens = 0;
  for (let i = 0; i < agentTurns; i++) inputTokens += promptTokens + i * a.historyTokensPerTurn;
  const llm = llmPrice ? llmCostFromTokens(inputTokens, agentTurns * a.outputTokensPerTurn, llmPrice) : 0;
  return minutes * agentUsdPerMinute(pricing) + llm;
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}
