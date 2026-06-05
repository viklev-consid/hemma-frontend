"use client";

import { createContext, useEffect, useMemo, use, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { handleProblem, problemFromResponse } from "@/api/problems";
import type {
  AcceptedLegalDocumentRequest,
  GetCurrentUserResponse,
  RegisterResponse,
} from "@/api/generated";
import { listMyOrganizationsOptions } from "@/api/generated/@tanstack/react-query.gen";
import {
  currentUserQueryKey,
  fetchCurrentUserQuery,
  fetchSessionQuery,
  sessionQueryKey,
} from "@/lib/auth-query";
import { safeNextPath } from "@/lib/safe-next-path";
import {
  clearTwoFactorChallenge,
  readTwoFactorChallenge,
  saveTwoFactorChallenge,
} from "@/lib/two-factor-challenge";
import { Toaster } from "@/components/ui/sonner";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
  /** Token for an existing pending system-level user invitation. */
  invitationToken?: string | null;
  /**
   * Token from an organization invitation link
   * (`/invite?token=...`). The server cross-validates this against the
   * Organizations module, creates the account, then auto-consumes the
   * invite — joining the user to the inviting org as part of registration.
   */
  organizationInvitationToken?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  currentUser: GetCurrentUserResponse | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login(
    email: string,
    password: string,
    nextPath?: string | null,
  ): Promise<void>;
  completeTwoFactorLogin(code: string, nextPath?: string | null): Promise<void>;
  register(data: RegisterInput): Promise<RegisterResponse>;
  resendEmailConfirmation(email: string): Promise<void>;
  completeOnboarding(
    data: {
      acceptMarketingEmails: boolean;
      acceptedDocuments: AcceptedLegalDocumentRequest[];
    },
    options?: { next?: string },
  ): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { redirectOnUnauthorized?: boolean },
) {
  const { redirectOnUnauthorized = true, ...requestInit } = init ?? {};
  const response = await fetch(input, {
    ...requestInit,
    headers: {
      "content-type": "application/json",
      ...requestInit.headers,
    },
  });

  if (!response.ok) {
    const problem = await problemFromResponse(response);
    if (redirectOnUnauthorized || problem.status !== 401) {
      handleProblem(problem);
    }
    throw problem;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function AuthProviderInner({ children }: { children: ReactNode }) {
  const t = useTranslations("components.auth.toast");
  const { push } = useRouter();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSessionQuery,
    retry: false,
  });

  const currentUserQuery = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUserQuery,
    enabled: Boolean(sessionQuery.data),
    retry: false,
  });

  // Prefetch the caller's organizations once the user resolves. Scoped
  // permissions live on these entries and are needed by `<Can inOrg>` /
  // `usePermission(_, orgId)` everywhere under `/app`. We also re-trigger on
  // currentUser changes so a re-login picks up a fresh list.
  useEffect(() => {
    if (!currentUserQuery.data) return;
    void queryClient.prefetchQuery(listMyOrganizationsOptions());
  }, [currentUserQuery.data, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: sessionQuery.data ?? null,
      currentUser: currentUserQuery.data ?? null,
      permissions: currentUserQuery.data?.permissions ?? [],
      isAuthenticated: Boolean(sessionQuery.data),
      isLoading: sessionQuery.isLoading || currentUserQuery.isFetching,
      async login(email, password, nextPath) {
        type LoginResult =
          | { status: "Authenticated"; user: AuthUser }
          | {
              status: "TwoFactorRequired";
              challengeToken: string;
              expiresAt: string;
            };

        const result = await fetchJson<LoginResult>("/api/auth/login", {
          method: "POST",
          redirectOnUnauthorized: false,
          body: JSON.stringify({ email, password }),
        });

        if (result.status === "TwoFactorRequired") {
          saveTwoFactorChallenge({
            challengeToken: result.challengeToken,
            expiresAt: result.expiresAt,
            nextPath: nextPath ?? null,
          });
          push("/login/two-factor");
          return;
        }

        queryClient.setQueryData(sessionQueryKey, result.user);
        const profile = await queryClient.fetchQuery({
          queryKey: currentUserQueryKey,
          queryFn: fetchCurrentUserQuery,
        });
        if (profile.hasCompletedOnboarding) {
          await queryClient.prefetchQuery(listMyOrganizationsOptions());
        }
        push(
          profile.hasCompletedOnboarding
            ? safeNextPath(nextPath)
            : "/onboarding",
        );
      },
      async completeTwoFactorLogin(code, nextPath) {
        const challenge = readTwoFactorChallenge();
        if (!challenge) {
          // The challenge was cleared (another tab, expiry, etc.). The page
          // already redirects on mount when it's missing; this is just a
          // belt-and-braces fallback. Resolve cleanly so the caller's catch
          // doesn't paint a stale error before navigation completes.
          push("/login");
          return;
        }

        const result = await fetchJson<{
          status: "Authenticated";
          user: AuthUser;
        }>("/api/auth/login/two-factor", {
          method: "POST",
          redirectOnUnauthorized: false,
          body: JSON.stringify({
            challengeToken: challenge.challengeToken,
            code,
          }),
        });

        clearTwoFactorChallenge();
        queryClient.setQueryData(sessionQueryKey, result.user);
        const profile = await queryClient.fetchQuery({
          queryKey: currentUserQueryKey,
          queryFn: fetchCurrentUserQuery,
        });
        if (profile.hasCompletedOnboarding) {
          await queryClient.prefetchQuery(listMyOrganizationsOptions());
        }
        const target = nextPath ?? challenge.nextPath;
        push(
          profile.hasCompletedOnboarding ? safeNextPath(target) : "/onboarding",
        );
      },
      async register(data) {
        return await fetchJson<RegisterResponse>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      async resendEmailConfirmation(email) {
        await fetchJson<{ message?: string }>(
          "/api/auth/email/confirmation/resend",
          {
            method: "POST",
            body: JSON.stringify({ email }),
          },
        );
        toast.success(t("confirmationSent.title"), {
          description: t("confirmationSent.description"),
        });
      },
      async completeOnboarding(data, options) {
        await fetchJson<void>("/api/auth/onboarding", {
          method: "POST",
          body: JSON.stringify(data),
        });
        await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
        // Default lands on the cross-org dashboard; callers can override
        // when they want to drop the user into a specific destination
        // (e.g. the org they just created during onboarding).
        push(options?.next ?? "/app");
      },
      async logout() {
        await fetch("/api/auth/logout", { method: "POST" });
        queryClient.clear();
        push("/login");
      },
    }),
    [
      currentUserQuery.data,
      currentUserQuery.isFetching,
      push,
      queryClient,
      sessionQuery.data,
      sessionQuery.isLoading,
      t,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthProviderInner>{children}</AuthProviderInner>
      <Toaster />
    </>
  );
}

export function useAuth() {
  const context = use(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export function useCurrentUser() {
  return useAuth().currentUser;
}
