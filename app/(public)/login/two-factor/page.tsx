import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { LoginShell } from "../login-form";
import { TwoFactorForm } from "./two-factor-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.auth.twoFactor");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function LoginTwoFactorPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <TwoFactorForm />
    </Suspense>
  );
}
