import { getRequestConfig } from "next-intl/server";

import { getLocaleFromCookie } from "./cookie";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const loaders: Record<Locale, () => Promise<{ default: unknown }>> = {
  en: () => import("@/messages/en"),
};

export default getRequestConfig(async () => {
  const locale = (await getLocaleFromCookie()) ?? DEFAULT_LOCALE;
  const messages = (await loaders[locale]()).default as Record<string, unknown>;

  return {
    locale,
    messages,
    now: new Date(),
  };
});
