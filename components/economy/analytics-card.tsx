"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type ChartCardProps = {
  title: string;
  description: string;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  /** Empty-state copy; defaults to the shared "Not enough data yet" message. */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Optional header control (filter, period steppers). */
  action?: ReactNode;
  /** Loading placeholder; defaults to a chart-shaped skeleton. */
  loadingSlot?: ReactNode;
  children: ReactNode;
};

/**
 * Shared chrome for every analytics card: title + description, an optional
 * header action, and the four mutually exclusive body states — loading →
 * skeleton, error → message, empty → the honest "Not enough data yet" card,
 * else the chart. Centralizing this keeps each chart component to just its
 * query + plot. Lives apart from `analytics-page.tsx` so the chart components
 * can import it without a circular dependency.
 */
export function ChartCard({
  title,
  description,
  isLoading,
  isError,
  isEmpty,
  emptyTitle,
  emptyDescription,
  action,
  loadingSlot,
  children,
}: ChartCardProps) {
  const t = useTranslations("economy.analytics");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          (loadingSlot ?? <Skeleton className="aspect-video w-full" />)
        ) : isError ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {t("loadError")}
          </p>
        ) : isEmpty ? (
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyTitle className="text-sm">
                {emptyTitle ?? t("empty.title")}
              </EmptyTitle>
              <EmptyDescription className="text-xs">
                {emptyDescription ?? t("empty.description")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
