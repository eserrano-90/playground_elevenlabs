import type { Dictionary } from "@/lib/i18n/dictionaries";

export interface TourStep {
  /** `data-tour` value of the element to highlight. Omit for a centered intro step. */
  target?: string;
  title: string;
  body: string;
  side?: "top" | "bottom" | "left" | "right";
}

export interface Tour {
  id: string;
  match: (pathname: string) => boolean;
  steps: TourStep[];
}

type Tours = Dictionary["tours"];
type StepDef<K extends keyof Tours> = { key: keyof Tours[K]; target?: string; side?: TourStep["side"] };

/** Tour ids and anchors. Text comes from the dictionary; ids stay stable across languages. */
const TOURS: { [K in keyof Tours]: { id: string; match: (p: string) => boolean; steps: StepDef<K>[] } } = {
  home: {
    id: "home",
    match: (p) => p === "/",
    steps: [
      { key: "welcome" },
      { key: "variants", target: "nav-variants" },
      { key: "scenarios", target: "nav-scenarios" },
      { key: "benchmarks", target: "nav-benchmarks" },
      { key: "live", target: "nav-live" },
      { key: "metrics", target: "nav-metrics" },
      { key: "settings", target: "nav-settings" },
      { key: "newBenchmark", target: "new-benchmark", side: "left" },
      { key: "language", target: "language", side: "left" },
      { key: "tourButton", target: "tour-button", side: "left" },
    ],
  },
  variants: {
    id: "variants",
    match: (p) => p.startsWith("/variants"),
    steps: [
      { key: "form", target: "variant-form", side: "right" },
      { key: "advanced", target: "variant-advanced", side: "right" },
      { key: "list", target: "variant-list", side: "left" },
    ],
  },
  scenarios: {
    id: "scenarios",
    match: (p) => p.startsWith("/scenarios"),
    steps: [
      { key: "templates", target: "scenario-templates" },
      { key: "generate", target: "scenario-generate" },
      { key: "agent", target: "scenario-agent", side: "right" },
      { key: "user", target: "scenario-user", side: "right" },
      { key: "list", target: "scenario-list", side: "left" },
    ],
  },
  newBenchmark: {
    id: "new-benchmark",
    match: (p) => p === "/benchmarks/new",
    steps: [
      { key: "picks", target: "benchmark-picks" },
      { key: "summary", target: "benchmark-summary", side: "left" },
    ],
  },
  benchmark: {
    id: "benchmark",
    match: (p) => /^\/benchmarks\/\d+/.test(p),
    steps: [
      { key: "actions", target: "benchmark-actions", side: "left" },
      { key: "highlights", target: "benchmark-highlights" },
      { key: "tabs", target: "benchmark-tabs" },
    ],
  },
  live: {
    id: "live",
    match: (p) => p.startsWith("/live"),
    steps: [
      { key: "session", target: "live-session" },
      { key: "results", target: "live-results", side: "top" },
    ],
  },
  metrics: {
    id: "metrics",
    match: (p) => p.startsWith("/metrics"),
    steps: [
      { key: "sections", target: "metrics-sections" },
      { key: "complexity", target: "metrics-complexity", side: "top" },
      { key: "cost", target: "metrics-cost", side: "top" },
    ],
  },
  settings: {
    id: "settings",
    match: (p) => p.startsWith("/settings"),
    steps: [
      { key: "pricing", target: "settings-pricing" },
      { key: "llms", target: "settings-llms" },
      { key: "agents", target: "settings-agents" },
    ],
  },
};

export function tourForPath(pathname: string, t: Dictionary): Tour | null {
  const name = (Object.keys(TOURS) as (keyof Tours)[]).find((k) => TOURS[k].match(pathname));
  if (!name) return null;
  const def = TOURS[name];
  const text = t.tours[name] as Record<string, { title: string; body: string }>;
  return {
    id: def.id,
    match: def.match,
    steps: def.steps.map((s) => ({ target: s.target, side: s.side, ...text[s.key as string] })),
  };
}
