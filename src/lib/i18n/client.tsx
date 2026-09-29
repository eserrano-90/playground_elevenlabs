"use client";

import * as React from "react";
import { createFormatters } from "@/lib/format";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { DICTIONARIES } from "./dictionaries";

// Dictionaries hold functions, which can't cross the server→client boundary, so the client
// imports them itself and the server only passes the locale string.
const LocaleContext = React.createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale() {
  return React.use(LocaleContext);
}

export function useT() {
  return DICTIONARIES[useLocale()];
}

export function useFormat() {
  const locale = useLocale();
  return React.useMemo(() => createFormatters(locale), [locale]);
}
