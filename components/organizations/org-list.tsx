"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Building2Icon, PlusIcon } from "lucide-react";

import { listMyOrganizationsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { OrgRoleBadge } from "@/components/organizations/org-role-badge";

export function OrgList() {
  const t = useTranslations("organizations.list");
  const { data, isLoading } = useQuery(listMyOrganizationsOptions());

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  const organizations = data?.organizations ?? [];

  if (organizations.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{t("empty.title")}</EmptyTitle>
        <EmptyDescription>{t("empty.description")}</EmptyDescription>
        <Link
          href="/app/organizations/new"
          className={buttonVariants({ className: "mt-4 w-fit mx-auto" })}
        >
          <PlusIcon />
          <span>{t("empty.action")}</span>
        </Link>
      </Empty>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {organizations.map((org) => (
        <Card key={org.organizationId} className="group">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="grid gap-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2Icon className="size-4 text-muted-foreground" />
                  {org.name}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  /{org.slug}
                </CardDescription>
              </div>
              <OrgRoleBadge role={org.role} />
            </div>
          </CardHeader>
          <CardContent>
            <Link
              href={`/app/o/${org.slug}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "w-full",
              })}
            >
              {t("open")}
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
