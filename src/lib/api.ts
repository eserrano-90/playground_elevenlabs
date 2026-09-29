import "server-only";
import { z } from "zod";
import { BenchmarkValidationError } from "@/lib/services/benchmarks";
import { NotFoundError } from "@/lib/services/live";
import { ElevenLabsError } from "@/lib/elevenlabs/http";
import { fieldErrors } from "@/lib/validation";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`);

/** Parses a positive integer route param or throws 400. */
export function intParam(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Invalid id: ${value}`);
  return n;
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
  return schema.parse(json);
}

/** Wraps a route handler, mapping domain errors to JSON responses `{ error, fields? }`. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response | unknown> | Response | unknown) {
  return async (...args: A): Promise<Response> => {
    try {
      const out = await fn(...args);
      return out instanceof Response ? out : Response.json(out ?? { ok: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return Response.json({ error: "Validation failed", fields: fieldErrors(err) }, { status: 400 });
      }
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      if (err instanceof BenchmarkValidationError) return Response.json({ error: err.message }, { status: 400 });
      if (err instanceof NotFoundError) return Response.json({ error: err.message }, { status: 404 });
      if (err instanceof ElevenLabsError) {
        return Response.json({ error: `ElevenLabs: ${err.message}`, status: err.status }, { status: 502 });
      }
      console.error(err);
      return Response.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
    }
  };
}
