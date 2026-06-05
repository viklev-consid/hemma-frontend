import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";

import messages from "@/messages/en";
import { DEFAULT_LOCALE } from "@/i18n/locales";

function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

export function renderWithIntl(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: IntlWrapper, ...options });
}
