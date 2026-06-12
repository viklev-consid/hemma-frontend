"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon } from "lucide-react";

import type { ProblemDetails } from "@/api/problems";
import { handleProblem } from "@/api/problems";
import {
  deletePropertyProjectMutation,
  getPropertyProjectOptions,
  listPropertyProjectsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { Money } from "@/components/economy/money";
import { ProjectForm } from "@/components/property/projects/project-form";
import { ProjectStatusBadge } from "@/components/property/projects/project-status-badge";
import { PropertyCardSkeleton } from "@/components/property/property-skeletons";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { useHousehold } from "@/lib/household-context";
import { formatDateOnly } from "@/lib/property/dates";
import { useCanWriteProperty } from "@/lib/property/use-can-write-property";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-2 border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function ProjectDetail({ projectId }: { projectId: string }) {
  const t = useTranslations("property.projects.detail");
  const td = useTranslations("property.projects.deleteConfirm");
  const { householdId, slug } = useHousehold();
  const canWrite = useCanWriteProperty(householdId);
  const queryClient = useQueryClient();
  const { push } = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery(
    getPropertyProjectOptions({
      path: { projectId },
      query: { householdId },
    }),
  );

  const deleteMutation = useMutation({
    ...deletePropertyProjectMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: listPropertyProjectsQueryKey({ query: { householdId } }),
      });
      toast.success(td("deletedToast"));
      push(`/app/h/${slug}/property/projects`);
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  if (isLoading) {
    return <PropertyCardSkeleton />;
  }

  if (isError || !project) {
    // 404 (not found / no access) and anything else land on the same terminal
    // state — there's no project to render either way.
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("notFound.title")}</EmptyTitle>
          <EmptyDescription>{t("notFound.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const hasDates = project.targetStartDate || project.targetEndDate;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description ? (
            <p className="max-w-prose text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
        </div>
        {canWrite ? (
          <div className="flex gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm">
                    <PencilIcon />
                    <span>{t("edit")}</span>
                  </Button>
                }
              />
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{project.name}</DialogTitle>
                </DialogHeader>
                <ProjectForm
                  project={project}
                  onSuccess={() => setEditOpen(false)}
                  onCancel={() => setEditOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="ghost" size="sm">
                    <Trash2Icon />
                    <span>{t("delete")}</span>
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{td("title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {td("description", { name: project.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{td("cancel")}</AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() =>
                      deleteMutation.mutate({
                        path: { projectId },
                        query: { householdId },
                      })
                    }
                  >
                    {deleteMutation.isPending ? td("deleting") : td("confirm")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </div>

      <dl className="grid gap-4 border p-4 sm:grid-cols-2">
        <Detail label={t("area")}>{project.area || "—"}</Detail>
        <Detail label={t("targetDates")}>
          {hasDates
            ? t("dateRange", {
                start: formatDateOnly(project.targetStartDate) || "…",
                end: formatDateOnly(project.targetEndDate) || "…",
              })
            : "—"}
        </Detail>
        <Detail label={t("budgetEstimate")}>
          {project.budgetEstimate ? (
            <Money value={project.budgetEstimate} />
          ) : (
            "—"
          )}
        </Detail>
        {project.completedAt ? (
          <Detail label={t("completedAt")}>
            {formatDateOnly(project.completedAt.slice(0, 10))}
          </Detail>
        ) : null}
      </dl>

      <Section title={t("notes")}>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
          {project.notes || t("noNotes")}
        </p>
      </Section>

      {/* Phase 3 fills these nested collections in. */}
      <Section title={t("tasks.title")}>
        <p className="text-sm text-muted-foreground">
          {t("tasks.placeholder")}
        </p>
      </Section>
      <Section title={t("links.title")}>
        <p className="text-sm text-muted-foreground">
          {t("links.placeholder")}
        </p>
      </Section>
      <Section title={t("attachments.title")}>
        <p className="text-sm text-muted-foreground">
          {t("attachments.placeholder")}
        </p>
      </Section>
    </div>
  );
}
