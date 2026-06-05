import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { RegisterContent, RegisterShell } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.auth.register");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterShell />}>
      <RegisterContent />
    </Suspense>
  );
}
