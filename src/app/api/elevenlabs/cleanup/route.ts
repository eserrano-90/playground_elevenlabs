import { getDb } from "@/db/client";
import { handle } from "@/lib/api";
import { getElevenLabs } from "@/lib/elevenlabs";
import { cleanupBenchAgents } from "@/lib/elevenlabs/provisioning";

/** Deletes every `bench-` agent in the ElevenLabs account. */
export const POST = handle(() => cleanupBenchAgents(getDb(), getElevenLabs()));
