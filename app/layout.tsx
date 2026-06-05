import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { NotificationToast } from "@/components/notification-toast";
import { ProblemLabelsInit } from "@/components/problem-labels-init";
import { QueryProvider } from "@/components/query-provider";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.root");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable} font-mono antialiased`}
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <NuqsAdapter>
              <QueryProvider>
                <AuthProvider>
                  <ProblemLabelsInit />
                  {children}
                  <NotificationToast />
                </AuthProvider>
              </QueryProvider>
            </NuqsAdapter>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
