import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { AuthHydration } from "@/components/auth-hydration";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.onboarding");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthHydration requireCompletedOnboarding={false}>{children}</AuthHydration>
  );
}
