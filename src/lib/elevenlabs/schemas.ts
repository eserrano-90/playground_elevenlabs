import { z } from "zod";

// Response schemas are intentionally lenient: only fields we use are declared and
// unknown keys pass through, so API additions never break parsing.

const tokensUsage = z.looseObject({
  tokens: z.number().nullish(),
  price: z.number().nullish(),
});

const modelUsage = z.looseObject({
  input: tokensUsage.nullish(),
  input_cache_read: tokensUsage.nullish(),
  input_cache_write: tokensUsage.nullish(),
  output_total: tokensUsage.nullish(),
});

export const transcriptTurnSchema = z.looseObject({
  role: z.string(),
  message: z.string().nullish(),
  time_in_call_secs: z.number().nullish(),
  conversation_turn_metrics: z
    .looseObject({
      metrics: z.record(z.string(), z.looseObject({ elapsed_time: z.number() })).nullish(),
    })
    .nullish(),
  llm_usage: z.looseObject({ model_usage: z.record(z.string(), modelUsage).nullish() }).nullish(),
});
export type TranscriptTurn = z.infer<typeof transcriptTurnSchema>;

export const simulateResponseSchema = z.looseObject({
  simulated_conversation: z.array(transcriptTurnSchema),
  analysis: z.unknown().optional(),
});

export const conversationSchema = z.looseObject({
  conversation_id: z.string(),
  agent_id: z.string(),
  status: z.string(),
  has_audio: z.boolean().nullish(),
  transcript: z.array(transcriptTurnSchema),
  metadata: z.looseObject({
    call_duration_secs: z.number().nullish(),
    cost: z.number().nullish(),
    cost_fiat: z.number().nullish(),
    charging: z
      .looseObject({
        llm_price: z.number().nullish(),
        llm_charge: z.number().nullish(),
        call_charge: z.number().nullish(),
      })
      .nullish(),
  }),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const createAgentResponseSchema = z.looseObject({ agent_id: z.string() });

export const agentsListSchema = z.looseObject({
  agents: z.array(z.looseObject({ agent_id: z.string(), name: z.string().nullish() })),
  has_more: z.boolean().nullish(),
  next_cursor: z.string().nullish(),
});

export const voicesSchema = z.looseObject({
  voices: z.array(
    z.looseObject({
      voice_id: z.string(),
      name: z.string().nullish(),
      category: z.string().nullish(),
      preview_url: z.string().nullish(),
      labels: z.record(z.string(), z.string().nullish()).nullish(),
    }),
  ),
  has_more: z.boolean().nullish(),
  next_page_token: z.string().nullish(),
});

export const modelsSchema = z.array(
  z.looseObject({
    model_id: z.string(),
    name: z.string().nullish(),
    can_do_text_to_speech: z.boolean().nullish(),
    description: z.string().nullish(),
  }),
);

export const tokenSchema = z.looseObject({
  token: z.string(),
  conversation_id: z.string().nullish(),
});

export const anySchema = z.unknown();
