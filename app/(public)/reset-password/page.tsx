import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { ResetPasswordContent, ResetShell } from "./reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.auth.resetPassword");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetShell />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
