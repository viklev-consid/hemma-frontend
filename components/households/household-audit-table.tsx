"use client";

import "@/api/client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { useTranslations } from "next-intl";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "lucide-react";

import { getHouseholdAuditOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { HouseholdAuditEntryDto } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useCanInActiveHousehold } from "@/lib/active-household-permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHousehold } from "@/lib/household-context";
import { HOUSEHOLD_PERMISSION } from "@/lib/household-permission-strings";

const DEFAULT_PAGE_SIZE = 20;

const columnHelper = createColumnHelper<HouseholdAuditEntryDto>();

function toNumber(value: number | string) {
  return typeof value === "string" ? Number.parseInt(value, 10) : value;
}

/**
 * Renders the JSON payload string in a collapsible row.
 *
 * The backend ships `payload` as a JSON string (not a parsed object) to
 * keep the wire shape stable as event schemas evolve. We parse + pretty-
 * print on render and fall back to the raw string if parsing fails.
 *
 * Payloads above MAX_PAYLOAD_BYTES are shown truncated, raw — both
 * JSON.parse and JSON.stringify can block the main thread on multi-MB
 * inputs, and that's not what this UI is for. Real auditors who need
 * the full event should fetch it through the API directly.
 */
const MAX_PAYLOAD_BYTES = 64 * 1024;

function PayloadCell({ payload }: { payload: string }) {
  const t = useTranslations("households.audit.payload");
  const [open, setOpen] = useState(false);

  const { formatted, truncated } = useMemo(() => {
    if (payload.length > MAX_PAYLOAD_BYTES) {
      return {
        formatted: payload.slice(0, MAX_PAYLOAD_BYTES),
        truncated: true,
      };
    }
    try {
      return {
        formatted: JSON.stringify(JSON.parse(payload), null, 2),
        truncated: false,
      };
    } catch {
      return { formatted: payload, truncated: false };
    }
  }, [payload]);

  if (!payload) return <span className="text-muted-foreground">·</span>;

  return (
    <div className="grid gap-1">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="w-fit justify-start gap-1 text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ChevronDownIcon
          className={
            "size-3 transition-transform " + (open ? "rotate-0" : "-rotate-90")
          }
        />
        <span>{open ? t("hide") : t("show")}</span>
      </Button>
      {open ? (
        <div className="grid gap-1">
          {truncated ? (
            <p className="text-[10px] text-muted-foreground" role="status">
              {t("truncated")}
            </p>
          ) : null}
          <pre className="max-w-md overflow-auto rounded-md border bg-muted/40 p-2 text-[10px] leading-snug">
            <code>{formatted}</code>
          </pre>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Per-household audit trail.
 *
 * Pagination is mirrored to the URL (?page=N) via nuqs so the back button
 * works and deep links are stable. pageSize is fixed at 20 in v1; the
 * backend response carries `total` so we can compute the last page.
 *
 * The query is gated locally so direct navigation cannot start it before
 * permissions resolve.
 */
export function HouseholdAuditTable() {
  const t = useTranslations("households.audit");
  const household = useHousehold();
  const canReadAudit = useCanInActiveHousehold(HOUSEHOLD_PERMISSION.AuditRead);

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const { data, isLoading } = useQuery({
    ...getHouseholdAuditOptions({
      path: { householdRef: household.slug },
      query: { page, pageSize: DEFAULT_PAGE_SIZE },
    }),
    enabled: canReadAudit,
  });

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const total = data ? toNumber(data.total) : 0;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));

  const columns = useMemo(
    () => [
      columnHelper.accessor("occurredAt", {
        header: t("columns.occurredAt"),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground tabular-nums">
            {new Date(getValue()).toLocaleString()}
          </span>
        ),
      }),
      columnHelper.accessor("eventType", {
        header: t("columns.eventType"),
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("actorId", {
        header: t("columns.actor"),
        cell: ({ getValue }) => {
          const value = getValue();
          return value ? (
            <span className="font-mono text-xs text-muted-foreground">
              {value.slice(0, 8)}…
            </span>
          ) : (
            <span className="text-muted-foreground">{t("system")}</span>
          );
        },
      }),
      columnHelper.accessor("resourceType", {
        header: t("columns.resource"),
        cell: ({ row }) => {
          const type = row.original.resourceType;
          const id = row.original.resourceId;
          if (!type) return <span className="text-muted-foreground">·</span>;
          return (
            <span className="text-xs">
              <span className="font-medium">{type}</span>
              {id ? (
                <span className="ml-1 font-mono text-muted-foreground">
                  {id.slice(0, 8)}…
                </span>
              ) : null}
            </span>
          );
        },
      }),
      columnHelper.accessor("payload", {
        header: t("columns.payload"),
        cell: ({ getValue }) => <PayloadCell payload={getValue()} />,
      }),
    ],
    [t],
  );

  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[20vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{t("empty.title")}</EmptyTitle>
        <EmptyDescription>{t("empty.description")}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <section className="grid gap-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("pagination.summary", { page, total: totalPages })}</span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => prev - 1)}
              aria-label={t("pagination.prev")}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              aria-label={t("pagination.next")}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
