"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ProjectForm } from "@/components/property/projects/project-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHousehold } from "@/lib/household-context";

export function NewProjectPage() {
  const t = useTranslations("property.projects");
  const tf = useTranslations("property.projects.form");
  const { slug } = useHousehold();
  const { push } = useRouter();

  const listHref = `/app/h/${slug}/property/projects`;
  const close = () => push(listHref);

  return (
    <Dialog open onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tf("createTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <ProjectForm
          onSuccess={(project) => push(`${listHref}/${project.projectId}`)}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
