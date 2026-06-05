import { redirect } from "next/navigation";

import { adminRoutes } from "@/lib/admin-routes";
import { getServerCurrentUser } from "@/lib/server-auth";

export default async function AdminIndexPage() {
  const currentUser = await getServerCurrentUser();
  const firstRoute = adminRoutes.find((route) =>
    currentUser?.permissions.includes(route.permission),
  );

  if (firstRoute) {
    redirect(firstRoute.href);
  }

  return null;
}
