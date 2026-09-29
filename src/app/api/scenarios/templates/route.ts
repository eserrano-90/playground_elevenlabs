import { handle } from "@/lib/api";
import { SCENARIO_TEMPLATES } from "@/lib/scenarios/templates";

export const GET = handle(() => SCENARIO_TEMPLATES);
