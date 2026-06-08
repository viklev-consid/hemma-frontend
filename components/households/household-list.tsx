"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Building2Icon, PlusIcon } from "lucide-react";

import { listMyHouseholdsOptions } from "@/api/generated/@tanstack/react-query.gen";
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
import { HouseholdRoleBadge } from "@/components/households/household-role-badge";

export function HouseholdList() {
  const t = useTranslations("households.list");
  const { data, isLoading } = useQuery(listMyHouseholdsOptions());

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  const households = data?.households ?? [];

  if (households.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{t("empty.title")}</EmptyTitle>
        <EmptyDescription>{t("empty.description")}</EmptyDescription>
        <Link
          href="/app/households/new"
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
      {households.map((household) => (
        <Card key={household.householdId} className="group">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="grid gap-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2Icon className="size-4 text-muted-foreground" />
                  {household.name}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  /{household.slug}
                </CardDescription>
              </div>
              <HouseholdRoleBadge role={household.role} />
            </div>
          </CardHeader>
          <CardContent>
            <Link
              href={`/app/h/${household.slug}`}
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
