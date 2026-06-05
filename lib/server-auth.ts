import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { GetCurrentUserResponse } from "@/api/generated";
import { fetchBackend, publicUser, refreshSession } from "@/lib/backend";
import {
  getSession,
  hasRefreshableSession,
  hasUsableSession,
  shouldRefreshSession,
} from "@/lib/session";

export const getUsableServerSession = cache(async () => {
  const session = await getSession();

  if (!hasRefreshableSession(session)) {
    return null;
  }

  if (!hasUsableSession(session) || shouldRefreshSession(session)) {
    const nextSession = await refreshSession(session);

    if (!nextSession) {
      session.destroy();
      return null;
    }

    Object.assign(session, nextSession);
    await session.save();
  }

  return session;
});

export async function getServerSessionUser() {
  const session = await getUsableServerSession();

  if (!session?.user) {
    return null;
  }

  return publicUser(session.user);
}

export async function getServerCurrentUser() {
  const session = await getUsableServerSession();

  if (!session) {
    return null;
  }

  const response = await fetchBackend("/v1/users/me", {
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as GetCurrentUserResponse;
}

export async function requireServerPermission(permission: string) {
  const currentUser = await getServerCurrentUser();

  if (!currentUser?.permissions.includes(permission)) {
    redirect("/app");
  }

  return currentUser;
}

export async function syncServerOnboardingState(
  hasCompletedOnboarding: boolean,
) {
  const session = await getSession();

  if (!hasUsableSession(session)) {
    return;
  }

  if (session.hasCompletedOnboarding === hasCompletedOnboarding) {
    return;
  }

  session.hasCompletedOnboarding = hasCompletedOnboarding;
  await session.save();
}
