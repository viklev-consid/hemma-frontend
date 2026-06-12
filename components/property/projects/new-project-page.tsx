"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon } from "lucide-react";

import { ProjectForm } from "@/components/property/projects/project-form";
import { useHousehold } from "@/lib/household-context";

export function NewProjectPage() {
  const t = useTranslations("property.projects");
  const tf = useTranslations("property.projects.form");
  const { slug } = useHousehold();
  const { push } = useRouter();

  const listHref = `/app/h/${slug}/property/projects`;

  return (
    <section className="grid gap-4">
      <Link
        href={listHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        <span>{t("backToList")}</span>
      </Link>
      <h1 className="text-lg font-semibold">{tf("createTitle")}</h1>
      <ProjectForm
        onSuccess={(project) => push(`${listHref}/${project.projectId}`)}
        onCancel={() => push(listHref)}
      />
    </section>
  );
}
