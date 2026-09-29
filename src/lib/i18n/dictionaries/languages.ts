import type { ScenarioLanguage } from "@/lib/validation";

/** Scenario language names, shown in the active UI language. */
const en: Record<ScenarioLanguage, string> = { en: "English", es: "Spanish", fr: "French" };
const es: typeof en = { en: "Inglés", es: "Español", fr: "Francés" };
const fr: typeof en = { en: "Anglais", es: "Espagnol", fr: "Français" };

export const languages = { en, es, fr };
