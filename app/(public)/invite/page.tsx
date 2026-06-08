import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { InviteLanding } from "@/components/invite/invite-landing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.invite");
  return {
    title: t("title"),
    description: t("description"),
  };
}

/**
 * Public landing page for household invitation links.
 *
 * The backend embeds `${origin}/invite?token=...&email=...` in
 * invitation emails. The page branches on session state:
 * signed-in users see a one-click accept; signed-out users get
 * Create-account / Sign-in CTAs that carry the token forward.
 */
export default function InvitePage() {
  return (
    <Suspense>
      <InviteLanding />
    </Suspense>
  );
}
