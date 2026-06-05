import type messages from "@/messages/en";
import type { Locale } from "@/i18n/locales";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
