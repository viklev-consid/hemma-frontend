import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";

import { CreateHouseholdForm } from "@/components/households/create-household-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.households");
  return { title: t("create") };
}

export default async function NewHouseholdPage() {
  const t = await getTranslations("households.create");

  return (
    <section className="grid gap-4">
      <Link
        href="/app"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        <span>{t("back")}</span>
      </Link>
      <CreateHouseholdForm />
    </section>
  );
}
