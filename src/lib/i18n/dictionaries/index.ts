import type { Locale } from "@/lib/i18n/config";
import { common } from "./common";
import { languages } from "./languages";
import { nav } from "./nav";
import { status } from "./status";
import { tour } from "./tour";
import { tours } from "./tours";
import { results } from "./results";
import { benchmark } from "./benchmark";
import { runs } from "./runs";
import { benchmarks } from "./benchmarks";
import { newBenchmark } from "./new-benchmark";
import { live } from "./live";
import { variants } from "./variants";
import { settings } from "./settings";
import { scenarios } from "./scenarios";
import { templates } from "./templates";
import { metrics } from "./metrics";

/**
 * One file per namespace, each holding its en/es/fr strings side by side. English defines the
 * shape (`typeof en`), so a missing or extra key in es/fr fails the type check.
 */
const NAMESPACES = {
  common,
  nav,
  status,
  languages,
  tour,
  tours,
  results,
  benchmark,
  runs,
  benchmarks,
  newBenchmark,
  live,
  variants,
  settings,
  scenarios,
  templates,
  metrics,
};

type Namespaces = typeof NAMESPACES;
export type Dictionary = { [K in keyof Namespaces]: Namespaces[K]["en"] };

function build(locale: Locale): Dictionary {
  return Object.fromEntries(
    Object.entries(NAMESPACES).map(([k, ns]) => [k, ns[locale]]),
  ) as Dictionary;
}

export const DICTIONARIES: Record<Locale, Dictionary> = {
  en: build("en"),
  es: build("es"),
  fr: build("fr"),
};
