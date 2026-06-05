import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { currentUserQueryKey, sessionQueryKey } from "@/lib/auth-query";
import { createQueryClient } from "@/lib/query-client";
import {
  getServerCurrentUser,
  getServerSessionUser,
  syncServerOnboardingState,
} from "@/lib/server-auth";

export async function AuthHydration({
  children,
  requireCompletedOnboarding = true,
}: {
  children: ReactNode;
  requireCompletedOnboarding?: boolean;
}) {
  const [sessionUser, currentUser] = await Promise.all([
    getServerSessionUser(),
    getServerCurrentUser(),
  ]);

  if (!sessionUser || !currentUser) {
    redirect("/login");
  }

  if (requireCompletedOnboarding && !currentUser.hasCompletedOnboarding) {
    redirect("/onboarding");
  }

  if (!requireCompletedOnboarding && currentUser.hasCompletedOnboarding) {
    await syncServerOnboardingState(true);
    redirect("/app");
  }

  const queryClient = createQueryClient();
  queryClient.setQueryData(sessionQueryKey, sessionUser);
  queryClient.setQueryData(currentUserQueryKey, currentUser);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
