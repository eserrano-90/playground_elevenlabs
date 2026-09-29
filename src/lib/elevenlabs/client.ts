import { ElevenLabsHttp, type ElevenLabsHttpOptions } from "./http";
import {
  agentsListSchema,
  anySchema,
  conversationSchema,
  createAgentResponseSchema,
  modelsSchema,
  simulateResponseSchema,
  tokenSchema,
  voicesSchema,
} from "./schemas";
import { BENCH_AGENT_PREFIX, CONVERSATIONAL_TTS_MODELS } from "./agent-config";
import { normalizeTranscript } from "./transcript";

export interface VoiceOption {
  voiceId: string;
  name: string;
  category: string | null;
  previewUrl: string | null;
  labels: Record<string, string>;
}

export interface TtsModelOption {
  modelId: string;
  name: string;
}

export class ElevenLabsClient {
  readonly http: ElevenLabsHttp;

  constructor(opts: ElevenLabsHttpOptions) {
    this.http = new ElevenLabsHttp(opts);
  }

  async listVoices(): Promise<VoiceOption[]> {
    const out: VoiceOption[] = [];
    let token: string | undefined;
    // Paginate; cap pages to avoid runaway loops on huge libraries.
    for (let page = 0; page < 10; page++) {
      const { data } = await this.http.request("/v2/voices", voicesSchema, {
        query: { page_size: 100, next_page_token: token },
      });
      for (const v of data.voices) {
        out.push({
          voiceId: v.voice_id,
          name: v.name ?? v.voice_id,
          category: v.category ?? null,
          previewUrl: v.preview_url ?? null,
          labels: Object.fromEntries(
            Object.entries(v.labels ?? {}).filter((e): e is [string, string] => typeof e[1] === "string"),
          ),
        });
      }
      if (!data.has_more || !data.next_page_token) break;
      token = data.next_page_token;
    }
    return out;
  }

  /** TTS models from /v1/models restricted to those usable by Agents. */
  async listTtsModels(): Promise<TtsModelOption[]> {
    const { data } = await this.http.request("/v1/models", modelsSchema);
    const supported = new Set<string>(CONVERSATIONAL_TTS_MODELS);
    const fromApi = data
      .filter((m) => supported.has(m.model_id))
      .map((m) => ({ modelId: m.model_id, name: m.name ?? m.model_id }));
    // Conversational-only models (e.g. v3 conversational) may be absent from /v1/models.
    const seen = new Set(fromApi.map((m) => m.modelId));
    for (const id of CONVERSATIONAL_TTS_MODELS) {
      if (!seen.has(id)) fromApi.push({ modelId: id, name: id });
    }
    return fromApi;
  }

  async createAgent(body: unknown): Promise<string> {
    const { data } = await this.http.request("/v1/convai/agents/create", createAgentResponseSchema, {
      method: "POST",
      body,
    });
    return data.agent_id;
  }

  async updateAgent(agentId: string, body: unknown): Promise<void> {
    await this.http.request(`/v1/convai/agents/${encodeURIComponent(agentId)}`, anySchema, {
      method: "PATCH",
      body,
    });
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.http.request(`/v1/convai/agents/${encodeURIComponent(agentId)}`, anySchema, {
      method: "DELETE",
    });
  }

  async listBenchAgents(): Promise<{ agentId: string; name: string }[]> {
    const out: { agentId: string; name: string }[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 20; page++) {
      const { data } = await this.http.request("/v1/convai/agents", agentsListSchema, {
        query: { search: BENCH_AGENT_PREFIX, page_size: 100, cursor },
      });
      for (const a of data.agents) {
        if (a.name?.startsWith(BENCH_AGENT_PREFIX)) out.push({ agentId: a.agent_id, name: a.name });
      }
      if (!data.has_more || !data.next_cursor) break;
      cursor = data.next_cursor;
    }
    return out;
  }

  async simulateConversation(agentId: string, body: unknown) {
    const { data, raw } = await this.http.request(
      `/v1/convai/agents/${encodeURIComponent(agentId)}/simulate-conversation`,
      simulateResponseSchema,
      { method: "POST", body },
    );
    return { turns: normalizeTranscript(data.simulated_conversation), analysis: data.analysis, raw };
  }

  async getConversation(conversationId: string) {
    const { data, raw } = await this.http.request(
      `/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
      conversationSchema,
    );
    return {
      conversationId: data.conversation_id,
      status: data.status,
      hasAudio: data.has_audio ?? false,
      turns: normalizeTranscript(data.transcript),
      durationSecs: data.metadata.call_duration_secs ?? null,
      credits: data.metadata.cost ?? null,
      costFiatUsd: data.metadata.cost_fiat ?? null,
      llmChargeUsd: data.metadata.charging?.llm_price ?? null,
      raw,
    };
  }

  async getConversationAudio(conversationId: string): Promise<Response> {
    return this.http.rawFetch(`/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`);
  }

  /** Short-lived WebRTC token so the browser can connect without the API key. */
  async getConversationToken(agentId: string) {
    const { data } = await this.http.request("/v1/convai/conversation/token", tokenSchema, {
      query: { agent_id: agentId },
    });
    return { token: data.token, conversationId: data.conversation_id ?? null };
  }
}
