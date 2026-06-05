import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.auth.goodbye");
  return { title: t("title") };
}

export default async function GoodbyePage() {
  const t = await getTranslations("auth.goodbye");
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <CheckCircle2Icon className="size-6 text-emerald-600" />
          </div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/login" className={buttonVariants()}>
            {t("cta")}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
