"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SectionTab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function SectionTabs({
  tabs,
  className,
}: {
  tabs: readonly SectionTab[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Section"
      className={cn(
        "flex flex-wrap items-center gap-1 border-b pb-2",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isSectionRoot = tabs.some(
          (other) => other !== tab && other.href.startsWith(`${tab.href}/`),
        );
        const active = isSectionRoot
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
