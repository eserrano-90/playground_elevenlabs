import { handle } from "@/lib/api";
import { getElevenLabs } from "@/lib/elevenlabs";

export const GET = handle(() => getElevenLabs().listTtsModels());
