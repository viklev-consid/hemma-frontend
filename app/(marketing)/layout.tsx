import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getReadonlyServerSession } from "@/lib/server-auth";

export default async function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getReadonlyServerSession();

  if (session && session.hasCompletedOnboarding !== true) {
    redirect("/onboarding");
  }

  const t = await getTranslations("marketing.header");
  const isSignedIn = Boolean(session);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="text-sm font-medium">
            {t("brand")}
          </Link>
          <nav className="flex items-center gap-2">
            {isSignedIn ? (
              <Link href="/app" className={cn(buttonVariants({ size: "sm" }))}>
                {t("openApp")}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "sm", variant: "ghost" }),
                  )}
                >
                  {t("signIn")}
                </Link>
                <Link
                  href="/register"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  {t("getStarted")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
