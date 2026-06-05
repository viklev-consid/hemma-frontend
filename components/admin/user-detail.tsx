"use client";

import "@/api/client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeftIcon } from "lucide-react";

import {
  getAuditTrailOptions,
  getUserByIdOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import type { AuditEntryDto } from "@/api/generated";
import { RoleBadge } from "@/components/admin/role-badge";
import { RoleChangeDialog } from "@/components/admin/role-change-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function safeParse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ActivityRow({ entry }: { entry: AuditEntryDto }) {
  const format = useFormatter();
  const occurredAt = safeParse(entry.occurredAt);
  return (
    <li className="flex items-start gap-3 border-b py-2 last:border-b-0">
      <span className="mt-1 size-2 shrink-0 rounded-full bg-primary/60" />
      <div className="grid gap-0.5">
        <span className="text-sm font-medium">{entry.eventType}</span>
        <span className="text-xs text-muted-foreground">
          {occurredAt ? format.relativeTime(occurredAt) : entry.occurredAt}
        </span>
      </div>
    </li>
  );
}

export function UserDetail({
  userId,
  canReadAudit,
  canChangeRole,
}: {
  userId: string;
  canReadAudit: boolean;
  canChangeRole: boolean;
}) {
  const t = useTranslations("adminComponents.userDetail");
  const format = useFormatter();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const userQuery = useQuery(getUserByIdOptions({ path: { userId } }));
  const activityQuery = useQuery({
    ...getAuditTrailOptions({
      query: { actorId: userId, page: 1, pageSize: 5 },
    }),
    enabled: canReadAudit,
  });

  if (userQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (userQuery.error || !userQuery.data) {
    return (
      <div className="grid gap-4">
        <BackLink />
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            {t("loadError")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const user = userQuery.data;
  const activity = activityQuery.data?.entries ?? [];
  const joinedAt = safeParse(user.createdAt);

  return (
    <div className="grid gap-4">
      <BackLink />

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">
          {user.displayName || user.email}
        </h2>
        <RoleBadge role={user.role} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("info.title")}</CardTitle>
          <CardDescription>{t("info.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("info.email")}
              </dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("info.joined")}
              </dt>
              <dd>
                {joinedAt
                  ? format.dateTime(joinedAt, { dateStyle: "long" })
                  : user.createdAt}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("info.onboarding")}
              </dt>
              <dd>
                {user.hasCompletedOnboarding ? (
                  <Badge variant="secondary">{t("info.completed")}</Badge>
                ) : (
                  <Badge variant="destructive">{t("info.pending")}</Badge>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {canChangeRole ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("actions.title")}</CardTitle>
            <CardDescription>{t("actions.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setRoleDialogOpen(true)}>
              {t("actions.changeRole")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {canReadAudit ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("activity.title")}</CardTitle>
            <CardDescription>{t("activity.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {activityQuery.isLoading ? (
              <div className="grid gap-2">
                <Skeleton className="h-5" />
                <Skeleton className="h-5" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("activity.empty")}
              </p>
            ) : (
              <ul className="grid">
                {activity.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {canChangeRole ? (
        <RoleChangeDialog
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          userId={user.userId}
          userName={user.displayName || user.email}
          currentRole={user.role}
        />
      ) : null}
    </div>
  );
}

function BackLink() {
  const t = useTranslations("adminComponents.userDetail");
  return (
    <Link
      href="/app/admin/users"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" />
      {t("backToUsers")}
    </Link>
  );
}
