"use client";

import { useTranslations } from "next-intl";

import type { ProjectStatus } from "@/api/generated";
import { Badge } from "@/components/ui/badge";

/**
 * Status pill for a project, keyed off the generated `ProjectStatus` union.
 * The variant map is exhaustive over the union, so a new backend status fails
 * to typecheck here until it's given a variant + label.
 */
const STATUS_VARIANT: Record<
  ProjectStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  Planning: "secondary",
  Active: "default",
  OnHold: "outline",
  Done: "ghost",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const t = useTranslations("property.enums.projectStatus");
  return <Badge variant={STATUS_VARIANT[status]}>{t(status)}</Badge>;
}
