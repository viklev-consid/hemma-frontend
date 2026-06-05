import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.landing");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LandingPage() {
  const t = await getTranslations("marketing.landing");
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-4 py-20 md:px-6 md:py-28">
      <div className="grid max-w-2xl gap-4">
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          {t("title")}
        </h1>
        <p className="text-pretty text-base text-muted-foreground md:text-lg">
          {t("description")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
          {t("getStarted")}
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
        >
          {t("signIn")}
        </Link>
      </div>
    </section>
  );
}
