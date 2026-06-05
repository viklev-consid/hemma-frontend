import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";

import { CreateOrgForm } from "@/components/organizations/create-org-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.organizations");
  return { title: t("create") };
}

export default async function NewOrganizationPage() {
  const t = await getTranslations("organizations.create");

  return (
    <section className="grid gap-4">
      <Link
        href="/app"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        <span>{t("back")}</span>
      </Link>
      <CreateOrgForm />
    </section>
  );
}
