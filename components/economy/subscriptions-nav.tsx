"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Small in-page nav between the three subscription surfaces (board / year
 * schedule / month calendar). Rendered by the subscriptions segment layout —
 * the shell's Subscriptions tab stays lit for all three via its prefix match.
 */
export function SubscriptionsNav({ slug }: { slug: string }) {
  const t = useTranslations("economy.subscriptions.nav");
  const pathname = usePathname();
  const base = `/app/h/${slug}/economy/subscriptions`;

  const views = [
    { href: base, key: "board" as const },
    { href: `${base}/year`, key: "year" as const },
    { href: `${base}/month`, key: "month" as const },
  ];

  return (
    <nav aria-label={t("label")} className="flex flex-wrap gap-1 text-sm">
      {views.map((view) => {
        const active =
          view.href === base
            ? pathname === base
            : pathname === view.href || pathname.startsWith(`${view.href}/`);
        return (
          <Link
            key={view.key}
            href={view.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5",
              active
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(view.key)}
          </Link>
        );
      })}
    </nav>
  );
}
