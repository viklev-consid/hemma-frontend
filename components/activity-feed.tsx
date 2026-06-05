"use client";

import "@/api/client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useFormatter, useNow, useTranslations } from "next-intl";

import { getAuditTrailInfiniteOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { AuditEntryDto } from "@/api/generated";
import { auditEventColor } from "@/components/admin/audit-event-color";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const PAGE_SIZE = 20;

function toNumber(value: number | string) {
  return typeof value === "string" ? Number.parseInt(value, 10) : value;
}

function safeParse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function TimelineEntry({ entry, now }: { entry: AuditEntryDto; now: Date }) {
  const format = useFormatter();
  const occurredAt = safeParse(entry.occurredAt);
  return (
    <li className="flex items-start gap-3 border-b py-3 last:border-b-0">
      <span
        className={`mt-1.5 size-2 shrink-0 rounded-full ${auditEventColor(entry.eventType)}`}
      />
      <div className="grid gap-0.5">
        <span className="text-sm font-medium">{entry.eventType}</span>
        <span
          className="text-xs text-muted-foreground"
          title={
            occurredAt
              ? format.dateTime(occurredAt, {
                  dateStyle: "long",
                  timeStyle: "medium",
                })
              : entry.occurredAt
          }
        >
          {occurredAt ? format.relativeTime(occurredAt, now) : entry.occurredAt}
        </span>
      </div>
    </li>
  );
}

export function ActivityFeed() {
  const t = useTranslations("components.activityFeed");
  const now = useNow({ updateInterval: 60_000 });
  const query = useInfiniteQuery({
    ...getAuditTrailInfiniteOptions({
      query: { pageSize: PAGE_SIZE },
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (sum, page) => sum + page.entries.length,
        0,
      );
      const total = toNumber(lastPage.total);
      if (loaded >= total) {
        return undefined;
      }
      return allPages.length + 1;
    },
  });

  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];

  if (query.isLoading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          {t("empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <ul className="grid">
          {entries.map((entry) => (
            <TimelineEntry key={entry.id} entry={entry} now={now} />
          ))}
        </ul>
        <div className="flex items-center justify-center gap-2 pt-4">
          {query.isFetchingNextPage ? <Spinner className="size-3" /> : null}
          {query.hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            >
              {t("loadMore")}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("endOfFeed")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
