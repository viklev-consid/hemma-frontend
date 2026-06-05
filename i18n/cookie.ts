import { cookies } from "next/headers";

import { isLocale, type Locale } from "./locales";

export const LOCALE_COOKIE = "NEXT_LOCALE";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getLocaleFromCookie(): Promise<Locale | undefined> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : undefined;
}

export async function setLocaleCookie(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}
