"use client";

import "@/api/client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import {
  getUnreadNotificationCountOptions,
  listMyNotificationsOptions,
  markAllNotificationsAsReadMutation,
  markNotificationAsReadMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { MyNotificationResponse } from "@/api/generated";
import {
  notificationCategoryKey,
  notificationQueryKeyPrefix,
  safeNotificationHref,
  unreadCountQueryKeyPrefix,
} from "@/components/notifications-utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function NotificationRow({
  notification,
  onSelect,
}: {
  notification: MyNotificationResponse;
  onSelect: (notification: MyNotificationResponse) => void;
}) {
  const t = useTranslations("components.notifications");
  const format = useFormatter();
  return (
    <button
      type="button"
      className={cn(
        "grid w-full gap-1 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
        !notification.isRead && "bg-sky-50 text-sky-950 dark:bg-sky-950/30",
      )}
      onClick={() => onSelect(notification)}
    >
      <span className="flex items-center gap-2">
        {!notification.isRead && (
          <span className="size-2 rounded-full bg-sky-500" />
        )}
        <span className={cn(!notification.isRead && "font-medium")}>
          {notification.title}
        </span>
      </span>
      <span className="text-xs text-muted-foreground">
        {t(`category.${notificationCategoryKey(notification.category)}`)} ·{" "}
        {format.relativeTime(new Date(notification.createdAt))}
      </span>
    </button>
  );
}

export function BellDropdown() {
  const t = useTranslations("components.notifications.bell");
  const { push } = useRouter();
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery(
    listMyNotificationsOptions({
      query: { limit: 5, status: "unread-first" },
    }),
  );
  const unreadQuery = useQuery(getUnreadNotificationCountOptions());
  const markRead = useMutation(markNotificationAsReadMutation());
  const markAllRead = useMutation(markAllNotificationsAsReadMutation());
  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = Number(unreadQuery.data?.count ?? 0);

  async function refreshNotifications() {
    await Promise.all([
      queryClient.invalidateQueries(notificationQueryKeyPrefix()),
      queryClient.invalidateQueries(unreadCountQueryKeyPrefix()),
    ]);
  }

  async function selectNotification(notification: MyNotificationResponse) {
    if (!notification.isRead) {
      await markRead.mutateAsync({
        path: { notificationId: notification.id },
      });
      await refreshNotifications();
    }

    const href = safeNotificationHref(notification.link?.href);
    if (href) {
      push(href);
    }
  }

  async function markAll() {
    await markAllRead.mutateAsync({});
    await refreshNotifications();
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="icon" variant="ghost" aria-label={t("aria")}>
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute -mt-5 ml-5 min-w-4 rounded-full bg-sky-600 px-1 text-[10px] leading-4 text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-medium">{t("title")}</h2>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => {
              void markAll();
            }}
            disabled={markAllRead.isPending || unreadCount === 0}
          >
            {t("markAllRead")}
          </Button>
        </div>
        <Separator />
        <div className="grid gap-1 p-2">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onSelect={(item) => {
                  void selectNotification(item);
                }}
              />
            ))
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          )}
        </div>
        <Separator />
        <div className="p-2">
          <Link
            href="/app/notifications"
            className={buttonVariants({
              variant: "ghost",
              className: "w-full justify-center",
            })}
          >
            {t("viewAll")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
