import "server-only";
import { cookies, headers } from "next/headers";
import { createFormatters } from "@/lib/format";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  matchAcceptLanguage,
  type Locale,
} from "./config";
import { DICTIONARIES } from "./dictionaries";

/** UI locale: the `locale` cookie, else the browser's `Accept-Language`, else English. */
export async function getLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  return matchAcceptLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
}

export async function getT() {
  return DICTIONARIES[await getLocale()];
}

export function getFormat(locale: Locale) {
  return createFormatters(locale);
}
