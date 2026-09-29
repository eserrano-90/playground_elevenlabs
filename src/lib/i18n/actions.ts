"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "./config";

/** Persists the UI language. The caller refreshes the router so server components re-render. */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) throw new Error(`Unsupported locale: ${locale}`);
  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
}
