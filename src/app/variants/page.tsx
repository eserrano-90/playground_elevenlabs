import { getDb } from "@/db/client";
import { CONVERSATIONAL_TTS_MODELS } from "@/lib/elevenlabs/agent-config";
import { listVariants } from "@/lib/services/config";
import { listLlmOptions } from "@/lib/services/pricing";
import { VariantsManager } from "./variants-manager";

export const dynamic = "force-dynamic";

export default function VariantsPage() {
  const db = getDb();
  return (
    <VariantsManager
      initialVariants={listVariants(db)}
      llms={listLlmOptions(db).map((l) => ({ id: l.id, label: l.label }))}
      fallbackTtsModels={[...CONVERSATIONAL_TTS_MODELS]}
    />
  );
}
