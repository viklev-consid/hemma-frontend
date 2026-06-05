import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";

import messages from "@/messages/en";
import { DEFAULT_LOCALE } from "@/i18n/locales";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

type WrapperProps = {
  children: ReactNode;
  queryClient?: QueryClient;
};

export function AppTestProviders({ children, queryClient }: WrapperProps) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

type RenderArgs = Omit<RenderOptions, "wrapper"> & {
  queryClient?: QueryClient;
};

export function renderWithProviders(
  ui: ReactElement,
  options: RenderArgs = {},
) {
  const { queryClient, ...rest } = options;
  const client = queryClient ?? createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <AppTestProviders queryClient={client}>{children}</AppTestProviders>;
  }
  return { ...render(ui, { wrapper: Wrapper, ...rest }), queryClient: client };
}
