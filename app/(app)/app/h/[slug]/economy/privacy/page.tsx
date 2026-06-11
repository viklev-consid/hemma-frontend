import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PrivacyPage } from "@/components/economy/privacy-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("privacy") };
}

/**
 * Economy privacy disclosure + self-scoped GDPR export.
 *
 * Nothing to first-paint here, so there's no prefetch (ADR 0009 is for
 * route-critical reads). The only network call is the on-demand export `GET`,
 * triggered by a button click and streamed straight to a file download — never
 * prefetched or cached (it's sensitive personal data). The household shell
 * (`h/[slug]/layout.tsx`) already resolves the slug and gates membership, so
 * this page only renders the client disclosure surface.
 */
export default function EconomyPrivacyPage() {
  return <PrivacyPage />;
}
