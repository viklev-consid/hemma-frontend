"use client";

import "@/api/client";

import { useId, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useFormatter, useTranslations } from "next-intl";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { getAuditTrailOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { AuditEntryDto } from "@/api/generated";
import { auditEventColor } from "@/components/admin/audit-event-color";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const PAGE_SIZE = 20;

function toNumber(value: number | string) {
  return typeof value === "string" ? Number.parseInt(value, 10) : value;
}

function safeParse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function AuditRow({ entry }: { entry: AuditEntryDto }) {
  const t = useTranslations("adminComponents.auditTrail.row");
  const format = useFormatter();
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  const occurredAt = safeParse(entry.occurredAt);
  return (
    <li className="border-b last:border-b-0">
      <div className="flex items-start gap-3 py-3">
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            auditEventColor(entry.eventType),
          )}
        />
        <div className="grid flex-1 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{entry.eventType}</span>
            {entry.resourceType ? (
              <Badge variant="outline">{entry.resourceType}</Badge>
            ) : null}
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              aria-controls={detailId}
              aria-label={t("toggleAria", { eventType: entry.eventType })}
            >
              {t("detail")}
              <ChevronDownIcon
                className={cn(
                  "size-3 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>
          </div>
          <div className="text-xs text-muted-foreground">
            <span
              title={
                occurredAt
                  ? format.dateTime(occurredAt, {
                      dateStyle: "long",
                      timeStyle: "medium",
                    })
                  : entry.occurredAt
              }
            >
              {occurredAt ? format.relativeTime(occurredAt) : entry.occurredAt}
            </span>
            {entry.actorId ? (
              <>
                {" "}
                · {t("actorPrefix")}{" "}
                <code className="text-[10px]">{entry.actorId}</code>
              </>
            ) : null}
          </div>
          {expanded ? (
            <pre
              id={detailId}
              className="overflow-x-auto rounded-none bg-muted p-3 text-[11px] leading-relaxed"
            >
              {JSON.stringify(entry, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function AuditTrail() {
  const t = useTranslations("adminComponents.auditTrail");
  const tPagination = useTranslations("adminComponents.pagination");
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true }),
  );
  const [actorId, setActorId] = useQueryState(
    "actorId",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  );
  const [eventType, setEventType] = useQueryState(
    "eventType",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  );
  const debouncedActorId = useDebouncedValue(actorId, 300);
  const debouncedEventType = useDebouncedValue(eventType, 300);

  const query = useQuery({
    ...getAuditTrailOptions({
      query: {
        page,
        pageSize: PAGE_SIZE,
        ...(debouncedActorId ? { actorId: debouncedActorId } : {}),
        ...(debouncedEventType ? { eventType: debouncedEventType } : {}),
      },
    }),
    placeholderData: keepPreviousData,
  });

  const entries = query.data?.entries ?? [];
  const total = query.data ? toNumber(query.data.total) : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("summary", { total, page, totalPages })}
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <label
              htmlFor="audit-actor"
              className="text-xs text-muted-foreground"
            >
              {t("filters.actorLabel")}
            </label>
            <Input
              id="audit-actor"
              placeholder={t("filters.actorPlaceholder")}
              value={actorId}
              onChange={(event) => {
                void setActorId(event.target.value || null);
                void setPage(1);
              }}
            />
          </div>
          <div className="grid gap-1">
            <label
              htmlFor="audit-event-type"
              className="text-xs text-muted-foreground"
            >
              {t("filters.eventTypeLabel")}
            </label>
            <Input
              id="audit-event-type"
              placeholder={t("filters.eventTypePlaceholder")}
              value={eventType}
              onChange={(event) => {
                void setEventType(event.target.value || null);
                void setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {query.isLoading ? (
            <div className="grid gap-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : entries.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="grid">
              {entries.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        {query.isFetching ? <Spinner className="size-3" /> : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1 || query.isFetching}
        >
          <ChevronLeftIcon />
          {tPagination("prev")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || query.isFetching}
        >
          {tPagination("next")}
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
