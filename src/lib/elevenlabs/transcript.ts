import type { TranscriptTurn } from "./schemas";

export interface NormalizedTurn {
  index: number;
  role: "agent" | "user";
  message: string;
  timeInCallSecs: number | null;
  llmTtfbMs: number | null;
  ttsTtfbMs: number | null;
  llmModel: string | null;
  llmInputTokens: number | null;
  llmOutputTokens: number | null;
  llmPriceUsd: number | null;
}

/**
 * Metric keys look like `convai_llm_service_ttfb` / `convai_tts_service_ttfb`; values are seconds.
 * Matched loosely so renamed variants (e.g. `..._ttf_sentence`) do not shadow the TTFB value.
 */
function findTtfbMs(
  metrics: Record<string, { elapsed_time: number }> | null | undefined,
  service: "llm" | "tts",
): number | null {
  if (!metrics) return null;
  const exact = metrics[`convai_${service}_service_ttfb`];
  if (exact) return exact.elapsed_time * 1000;
  const key = Object.keys(metrics).find((k) => k.includes(service) && k.endsWith("ttfb"));
  return key ? metrics[key].elapsed_time * 1000 : null;
}

export function normalizeTranscript(turns: TranscriptTurn[]): NormalizedTurn[] {
  const out: NormalizedTurn[] = [];
  for (const t of turns) {
    const message = (t.message ?? "").trim();
    // Tool-call / system entries without text are not conversational turns.
    if (!message) continue;
    const role = t.role === "agent" ? "agent" : "user";

    let llmModel: string | null = null;
    let inTok: number | null = null;
    let outTok: number | null = null;
    let price: number | null = null;
    const usage = t.llm_usage?.model_usage;
    if (usage) {
      for (const [model, u] of Object.entries(usage)) {
        llmModel ??= model;
        const input =
          (u.input?.tokens ?? 0) + (u.input_cache_read?.tokens ?? 0) + (u.input_cache_write?.tokens ?? 0);
        const output = u.output_total?.tokens ?? 0;
        const p =
          (u.input?.price ?? 0) +
          (u.input_cache_read?.price ?? 0) +
          (u.input_cache_write?.price ?? 0) +
          (u.output_total?.price ?? 0);
        inTok = (inTok ?? 0) + input;
        outTok = (outTok ?? 0) + output;
        price = (price ?? 0) + p;
      }
    }

    const metrics = t.conversation_turn_metrics?.metrics;
    out.push({
      index: out.length,
      role,
      message,
      timeInCallSecs: t.time_in_call_secs ?? null,
      llmTtfbMs: role === "agent" ? findTtfbMs(metrics, "llm") : null,
      ttsTtfbMs: role === "agent" ? findTtfbMs(metrics, "tts") : null,
      llmModel,
      llmInputTokens: inTok,
      llmOutputTokens: outTok,
      llmPriceUsd: price,
    });
  }
  return out;
}
