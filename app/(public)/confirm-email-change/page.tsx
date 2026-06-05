import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { ConfirmEmailChangeContent } from "@/components/settings/confirm-email-change-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.auth.confirmEmailChange");
  return { title: t("title") };
}

export default function ConfirmEmailChangePage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Suspense>
        <ConfirmEmailChangeContent />
      </Suspense>
    </main>
  );
}
