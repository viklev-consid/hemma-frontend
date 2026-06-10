import type { ReactNode } from "react";

import { SubscriptionsNav } from "@/components/economy/subscriptions-nav";

export default async function EconomySubscriptionsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="grid gap-4">
      <SubscriptionsNav slug={slug} />
      {children}
    </div>
  );
}
