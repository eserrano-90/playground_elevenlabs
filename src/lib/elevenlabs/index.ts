import "server-only";
import { getEnv } from "@/lib/env";
import { ElevenLabsClient } from "./client";

let client: ElevenLabsClient | undefined;

export function getElevenLabs(): ElevenLabsClient {
  client ??= new ElevenLabsClient({ apiKey: getEnv().ELEVENLABS_API_KEY });
  return client;
}

export { ElevenLabsClient } from "./client";
export { ElevenLabsError, isRetryableError } from "./http";
