"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useTranslations } from "next-intl";
import { PlusIcon } from "lucide-react";

import { listPropertyProjectsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { Money } from "@/components/economy/money";
import { ProjectListSkeleton } from "@/components/property/property-skeletons";
import { ProjectStatusBadge } from "@/components/property/projects/project-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHousehold } from "@/lib/household-context";
import { formatDateOnly } from "@/lib/property/dates";
import { PROJECT_STATUS_OPTIONS } from "@/lib/property/enums";
import { projectFilterParsers } from "@/lib/property/project-filters";
import { useCanWriteProperty } from "@/lib/property/use-can-write-property";

const ALL = "all";

export function ProjectsListPage() {
  const t = useTranslations("property.projects");
  const te = useTranslations("property.enums.projectStatus");
  const { householdId, slug } = useHousehold();
  const canWrite = useCanWriteProperty(householdId);

  const [filters, setFilters] = useQueryStates(projectFilterParsers);
  const area = filters.area?.trim() ? filters.area.trim() : undefined;
  const hasFilters = Boolean(filters.status) || Boolean(area);

  const { data, isLoading } = useQuery(
    listPropertyProjectsOptions({
      query: {
        householdId,
        status: filters.status ?? undefined,
        area,
      },
    }),
  );

  const projects = data?.projects ?? [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canWrite ? (
          <Link
            href={`/app/h/${slug}/property/projects/new`}
            className={buttonVariants()}
          >
            <PlusIcon />
            <span>{t("new")}</span>
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field>
          <FieldLabel htmlFor="project-status-filter">
            {t("filters.status")}
          </FieldLabel>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) =>
              void setFilters({
                status:
                  value === ALL
                    ? null
                    : (value as (typeof PROJECT_STATUS_OPTIONS)[number]),
              })
            }
          >
            <SelectTrigger id="project-status-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filters.all")}</SelectItem>
              {PROJECT_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {te(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="project-area-filter">
            {t("filters.area")}
          </FieldLabel>
          <Input
            id="project-area-filter"
            type="text"
            value={filters.area ?? ""}
            placeholder={t("filters.areaPlaceholder")}
            onChange={(event) =>
              void setFilters({ area: event.target.value || null })
            }
          />
        </Field>

        <Button
          variant="ghost"
          disabled={!hasFilters}
          onClick={() => void setFilters({ status: null, area: null })}
        >
          {t("filters.clear")}
        </Button>
      </div>

      {isLoading ? (
        <ProjectListSkeleton />
      ) : projects.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {hasFilters ? t("emptyFiltered.title") : t("empty.title")}
            </EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? t("emptyFiltered.description")
                : t("empty.description")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => {
            const dates =
              project.targetStartDate || project.targetEndDate
                ? `${formatDateOnly(project.targetStartDate) || "…"} – ${formatDateOnly(project.targetEndDate) || "…"}`
                : t("row.noDates");
            return (
              <li key={project.projectId}>
                <Link
                  href={`/app/h/${slug}/property/projects/${project.projectId}`}
                  className="grid gap-2 border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{project.name}</span>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{project.area || t("row.noArea")}</span>
                    <span>{dates}</span>
                    <span>
                      {project.budgetEstimate ? (
                        <Money value={project.budgetEstimate} />
                      ) : (
                        t("row.noBudget")
                      )}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
