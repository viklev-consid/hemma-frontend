export type NotificationCategoryKey =
  | "product"
  | "collaboration"
  | "system"
  | "account"
  | "security"
  | "unknown";

export function notificationCategoryKey(
  category: number,
): NotificationCategoryKey {
  return (
    (
      {
        0: "product",
        1: "collaboration",
        2: "system",
        3: "account",
        4: "security",
      } as const
    )[category] ?? "unknown"
  );
}

export function safeNotificationHref(href: string | null | undefined) {
  if (!href || typeof window === "undefined") {
    return null;
  }

  try {
    const url = new URL(href, window.location.origin);

    if (url.origin !== window.location.origin) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function notificationQueryKeyPrefix() {
  return {
    predicate: (query: { queryKey: unknown }) => {
      const [params] = query.queryKey as Array<{ _id?: string }>;
      return params?._id === "listMyNotifications";
    },
  };
}

export function unreadCountQueryKeyPrefix() {
  return {
    predicate: (query: { queryKey: unknown }) => {
      const [params] = query.queryKey as Array<{ _id?: string }>;
      return params?._id === "getUnreadNotificationCount";
    },
  };
}
