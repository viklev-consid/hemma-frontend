import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { ConfirmEmailContent } from "@/components/auth/confirm-email-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.auth.confirmEmail");
  return { title: t("title") };
}

export default function ConfirmEmailPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Suspense>
        <ConfirmEmailContent />
      </Suspense>
    </main>
  );
}
