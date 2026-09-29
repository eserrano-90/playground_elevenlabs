import { getDb } from "@/db/client";
import { handle } from "@/lib/api";
import { listLlmOptions } from "@/lib/services/pricing";

export const GET = handle(() => listLlmOptions(getDb()));
