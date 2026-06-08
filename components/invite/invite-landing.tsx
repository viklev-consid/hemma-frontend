"use client";

import "@/api/client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle2Icon, MailIcon } from "lucide-react";
import { toast } from "sonner";

import {
  acceptHouseholdInvitationMutation,
  listMyHouseholdsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { problemHasErrorCode, type ProblemDetails } from "@/api/problems";
import { useAuth } from "@/components/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { HOUSEHOLD_ERRORS, USER_ERRORS } from "@/lib/household-errors";

/**
 * Public landing page for household invitation links.
 *
 * Routes the user differently depending on session state:
 *
 * - Signed in: shows "Accept invitation" → POST
 *   /v1/households/invitations/accept with the raw token, then
 *   bounces to /app/households on success.
 *
 * - Not signed in: prompts to register (carrying the token + email
 *   forward to the register form for prefill) or to sign in (carrying
 *   the full invite URL forward via the `?next=` param so the user
 *   lands back here, signed in, ready to accept).
 *
 * Backend error contract:
 * - `Households.Invitation.Invalid` and `Households.RegistrationUnavailable`
 *   are deliberately opaque (anti-enumeration). We collapse both into a
 *   single "This invitation isn't usable" message — no leak about whether
 *   the token was expired vs. never existed.
 */
export function InviteLanding() {
  const t = useTranslations("invite");
  const { replace } = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const { isAuthenticated, isLoading: authLoading, currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [opaqueError, setOpaqueError] = useState<string | null>(null);

  const mutation = useMutation({
    ...acceptHouseholdInvitationMutation(),
    onSuccess: async () => {
      // Picking up the new membership: invalidate /my so the switcher
      // and list page reflect it, then route into the app.
      await queryClient.invalidateQueries({
        queryKey: listMyHouseholdsQueryKey(),
      });
      toast.success(t("acceptedToast"));
      // An onboarding-incomplete user can land here (the `/invite` route
      // sits outside the onboarding gate so the token doesn't get lost),
      // accept successfully, then immediately get bounced back to
      // /onboarding by the proxy when we push to /app. Route them
      // directly to /onboarding so the trip is honest. Membership is
      // already attached to their account — finishing onboarding lands
      // them in /app with the new household visible.
      //
      // The accept response only carries `householdId`, not slug, so
      // even when onboarding IS complete we send to /app and let the
      // dashboard / picker route the user into the household.
      if (currentUser && !currentUser.hasCompletedOnboarding) {
        replace("/onboarding");
      } else {
        replace("/app");
      }
    },
    onError: (error) => {
      const problem = error as unknown as ProblemDetails;
      if (
        problemHasErrorCode(problem, HOUSEHOLD_ERRORS.InvitationInvalid) ||
        problemHasErrorCode(problem, USER_ERRORS.RegistrationUnavailable)
      ) {
        setOpaqueError(t("opaqueError"));
        return;
      }
      // Other errors: surface backend title/detail via the standard handler.
      setOpaqueError(problem.title ?? t("opaqueError"));
    },
  });

  if (authLoading) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner />
      </div>
    );
  }

  // Missing or empty token is an unusable link, but we still don't reveal
  // why — same opaque message as a server-rejected token.
  if (!token) {
    return (
      <Layout>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{t("invalid.title")}</CardTitle>
            <CardDescription>{t("opaqueError")}</CardDescription>
          </CardHeader>
        </Card>
      </Layout>
    );
  }

  if (isAuthenticated) {
    return (
      <Layout>
        <Card className="w-full max-w-md">
          <CardHeader>
            <MailIcon className="mb-2 size-5 text-muted-foreground" />
            <CardTitle>{t("signedIn.title")}</CardTitle>
            <CardDescription>
              {t.rich("signedIn.body", {
                email: currentUser?.email ?? "",
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </CardDescription>
          </CardHeader>
          {email &&
          email.toLowerCase() !== currentUser?.email?.toLowerCase() ? (
            <CardContent>
              <Alert>
                <AlertTitle>{t("emailMismatch.title")}</AlertTitle>
                <AlertDescription>
                  {t("emailMismatch.body", {
                    inviteEmail: email,
                    sessionEmail: currentUser?.email ?? "",
                  })}
                </AlertDescription>
              </Alert>
            </CardContent>
          ) : null}
          {opaqueError ? (
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>{opaqueError}</AlertDescription>
              </Alert>
            </CardContent>
          ) : null}
          <CardFooter className="flex flex-col gap-2">
            <Button
              className="w-full"
              disabled={mutation.isPending || mutation.isSuccess}
              onClick={() =>
                mutation.mutate({ body: { invitationToken: token } })
              }
            >
              {mutation.isSuccess ? (
                <>
                  <CheckCircle2Icon />
                  {t("acceptedShort")}
                </>
              ) : mutation.isPending ? (
                t("accepting")
              ) : (
                t("acceptCta")
              )}
            </Button>
          </CardFooter>
        </Card>
      </Layout>
    );
  }

  // Signed-out branch.
  const registerUrl = `/register?orgToken=${encodeURIComponent(
    token,
  )}${email ? `&email=${encodeURIComponent(email)}&lockEmail=1` : ""}`;
  // After sign-in, drop the user back on this exact landing so they
  // can one-click accept. Each value is individually encoded so emails
  // containing `+`, `&`, or `=` survive the next-param round-trip.
  const inviteReturnPath = `/invite?token=${encodeURIComponent(token)}${
    email ? `&email=${encodeURIComponent(email)}` : ""
  }`;
  const loginUrl = `/login?next=${encodeURIComponent(inviteReturnPath)}`;

  return (
    <Layout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <MailIcon className="mb-2 size-5 text-muted-foreground" />
          <CardTitle>{t("signedOut.title")}</CardTitle>
          <CardDescription>
            {email
              ? t.rich("signedOut.bodyWithEmail", {
                  email,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })
              : t("signedOut.body")}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2">
          <Link
            href={registerUrl}
            className={buttonVariants({ className: "w-full" })}
          >
            {t("signedOut.register")}
          </Link>
          <Link
            href={loginUrl}
            className={buttonVariants({
              variant: "outline",
              className: "w-full",
            })}
          >
            {t("signedOut.signIn")}
          </Link>
        </CardFooter>
      </Card>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      {children}
    </main>
  );
}
