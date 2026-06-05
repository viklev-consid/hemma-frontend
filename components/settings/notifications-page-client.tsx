"use client";

import "@/api/client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { BellIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import {
  archiveNotificationMutation,
  listMyNotificationsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import {
  notificationCategoryKey,
  notificationQueryKeyPrefix,
} from "@/components/notifications-utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const filters = ["all", "unread", "archived"] as const;

export function NotificationsPageClient() {
  const t = useTranslations("settingsForms.notificationsPage");
  const tCategory = useTranslations("components.notifications.category");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useQueryState("filter", {
    defaultValue: "all",
    parse: (value) => (filters.includes(value as never) ? value : "all"),
  });
  const [before, setBefore] = useQueryState("before");
  const notificationsQuery = useQuery(
    listMyNotificationsOptions({
      query: {
        status: filter === "all" ? undefined : filter,
        limit: 10,
        before: before ?? undefined,
      },
    }),
  );
  const archive = useMutation(archiveNotificationMutation());
  const notifications = notificationsQuery.data?.items ?? [];

  async function archiveOne(notificationId: string) {
    await archive.mutateAsync({ path: { notificationId } });
    await queryClient.invalidateQueries(notificationQueryKeyPrefix());
  }

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Select
          value={filter}
          onValueChange={(value) => {
            void setBefore(null);
            void setFilter(value);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.all")}</SelectItem>
            <SelectItem value="unread">{t("filter.unread")}</SelectItem>
            <SelectItem value="archived">{t("filter.archived")}</SelectItem>
          </SelectContent>
        </Select>
      </header>
      <Card>
        <CardContent className="grid gap-2 p-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between",
                  !notification.isRead &&
                    "border-sky-200 bg-sky-50/70 dark:bg-sky-950/20",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <span className="size-2 rounded-full bg-sky-500" />
                    )}
                    <h2 className="truncate text-sm font-medium">
                      {notification.title}
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {notification.body}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {tCategory(notificationCategoryKey(notification.category))}{" "}
                    · {format.relativeTime(new Date(notification.createdAt))}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={archive.isPending}
                  onClick={() => {
                    void archiveOne(notification.id);
                  }}
                >
                  {t("archive")}
                </Button>
              </div>
            ))
          ) : (
            <Card className="border-dashed">
              <CardHeader className="items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <BellIcon className="size-6 text-muted-foreground" />
                </div>
                <CardTitle>{t("empty.title")}</CardTitle>
                <CardDescription>{t("empty.description")}</CardDescription>
              </CardHeader>
            </Card>
          )}
        </CardContent>
      </Card>
      {notificationsQuery.data?.nextBefore && (
        <Button
          type="button"
          variant="outline"
          className="mx-auto"
          onClick={() => {
            void setBefore(notificationsQuery.data.nextBefore);
          }}
        >
          {t("loadMore")}
        </Button>
      )}
    </>
  );
}
