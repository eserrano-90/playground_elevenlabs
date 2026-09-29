import type { z } from "zod";

export const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }

  /** 429 and 5xx are transient; network failures (status null) too. 4xx are caller errors. */
  get retryable(): boolean {
    return isRetryableStatus(this.status);
  }
}

export function isRetryableStatus(status: number | null): boolean {
  if (status === null) return true;
  return status === 429 || status >= 500;
}

export function isRetryableError(err: unknown): boolean {
  return err instanceof ElevenLabsError ? err.retryable : false;
}

export type FetchLike = typeof fetch;

export interface ElevenLabsHttpOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: FetchLike;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface ParsedResponse<T> {
  data: T;
  /** Untouched JSON, persisted so new fields can be re-parsed later. */
  raw: unknown;
}

export class ElevenLabsHttp {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly opts: ElevenLabsHttpOptions) {
    this.baseUrl = opts.baseUrl ?? ELEVENLABS_BASE_URL;
    this.fetchImpl = opts.fetch ?? fetch;
  }

  /** Unparsed response for binary payloads (e.g. conversation audio). */
  async rawFetch(path: string): Promise<Response> {
    const res = await this.fetchImpl(new URL(path, this.baseUrl), {
      headers: { "xi-api-key": this.opts.apiKey },
    });
    if (!res.ok) throw new ElevenLabsError(`ElevenLabs GET ${path} failed (${res.status})`, res.status, null);
    return res;
  }

  async request<S extends z.ZodType>(
    path: string,
    schema: S,
    options: RequestOptions = {},
  ): Promise<ParsedResponse<z.infer<S>>> {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: options.method ?? "GET",
        headers: {
          "xi-api-key": this.opts.apiKey,
          ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (err) {
      throw new ElevenLabsError(`Network error calling ${path}: ${String(err)}`, null, null);
    }

    const text = await res.text();
    let raw: unknown = null;
    if (text) {
      try {
        raw = JSON.parse(text);
      } catch {
        raw = text;
      }
    }

    if (!res.ok) {
      throw new ElevenLabsError(
        `ElevenLabs ${options.method ?? "GET"} ${path} failed (${res.status}): ${describeError(raw)}`,
        res.status,
        raw,
      );
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new ElevenLabsError(
        `Unexpected response shape from ${path}: ${parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`,
        res.status,
        raw,
      );
    }
    return { data: parsed.data, raw };
  }
}

function describeError(raw: unknown): string {
  if (raw && typeof raw === "object" && "detail" in raw) {
    const detail = (raw as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      return String((detail as { message: unknown }).message);
    }
    return JSON.stringify(detail).slice(0, 300);
  }
  return typeof raw === "string" ? raw.slice(0, 300) : JSON.stringify(raw).slice(0, 300);
}
