import type { Locale } from "@/lib/i18n/config";

const dash = "—";

// BCP 47 tags per UI locale. en-GB keeps the day-month date order used before localization.
const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", es: "es-ES", fr: "fr-FR" };

export type Formatters = ReturnType<typeof createFormatters>;

/**
 * Locale-bound formatters. Always pass the locale explicitly (never the runtime default) so
 * server- and client-rendered output match and hydration doesn't mismatch.
 */
export function createFormatters(locale: Locale) {
  const tag = INTL_LOCALE[locale];
  const numCache = new Map<string, Intl.NumberFormat>();
  const nf = (key: string, opts: Intl.NumberFormatOptions) => {
    let f = numCache.get(key);
    if (!f) numCache.set(key, (f = new Intl.NumberFormat(locale === "en" ? "en-US" : tag, opts)));
    return f;
  };
  const dateFmt = new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" });
  const short = locale !== "en";

  const num = (v: number | null | undefined, digits = 1): string =>
    v == null ? dash : nf(`n${digits}`, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false }).format(v);

  return {
    usd: (v: number | null | undefined, digits = 4): string =>
      v == null
        ? dash
        : nf(`u${digits}`, { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v),
    ms: (v: number | null | undefined): string => (v == null ? dash : `${num(Math.round(v), 0)} ms`),
    num,
    secs: (v: number | null | undefined): string => {
      if (v == null) return dash;
      const m = Math.floor(v / 60);
      const s = Math.round(v % 60);
      if (short) return m ? `${m} min ${s} s` : `${s} s`;
      return m ? `${m}m ${s}s` : `${s}s`;
    },
    date: (v: Date | string | number | null | undefined): string => (v == null ? dash : dateFmt.format(new Date(v))),
  };
}

const en = createFormatters("en");

export const fmtUsd = en.usd;
export const fmtMs = en.ms;
export const fmtNum = en.num;
export const fmtSecs = en.secs;
export const fmtDate = en.date;
