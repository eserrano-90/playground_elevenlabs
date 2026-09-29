import { describe, expect, it } from "vitest";
import { scenarioInputSchema } from "@/lib/validation";
import { SCENARIO_TEMPLATES, TEMPLATE_LANGUAGES } from "./templates";

describe("SCENARIO_TEMPLATES", () => {
  it("includes the three required templates", () => {
    expect(SCENARIO_TEMPLATES.map((t) => t.id)).toEqual(["customer-service", "restaurant-booking", "medical-appointment"]);
  });

  it("has an en, es and fr variant for every template", () => {
    for (const t of SCENARIO_TEMPLATES) expect(Object.keys(t.variants).sort()).toEqual(["en", "es", "fr"]);
  });

  for (const t of SCENARIO_TEMPLATES) {
    for (const lang of TEMPLATE_LANGUAGES) {
      it(`${t.id}/${lang} is a valid scenario in its language`, () => {
        const v = t.variants[lang];
        const parsed = scenarioInputSchema.parse(v);
        expect(parsed.language).toBe(lang);
        expect(parsed.scriptedTurns!.length).toBeGreaterThanOrEqual(3);
        expect(parsed.personaPrompt).toBeTruthy();
        expect(scenarioInputSchema.safeParse({ ...v, userMode: "persona" }).success).toBe(true);
      });
    }
  }

  it("medical template restricts the agent to scheduling and redirects emergencies", () => {
    const med = SCENARIO_TEMPLATES.find((t) => t.id === "medical-appointment")!;
    expect(med.variants.en.systemPrompt).toMatch(/scheduling only/i);
    expect(med.variants.en.systemPrompt).toMatch(/emergency services/i);
    expect(med.variants.es.systemPrompt).toMatch(/solo gestionas citas/i);
    expect(med.variants.es.systemPrompt).toMatch(/servicios de emergencia/i);
    expect(med.variants.fr.systemPrompt).toMatch(/prise de rendez-vous uniquement/i);
    expect(med.variants.fr.systemPrompt).toMatch(/services d'urgence/i);
  });
});
