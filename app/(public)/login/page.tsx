import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { LoginForm, LoginShell } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.auth.login");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}
