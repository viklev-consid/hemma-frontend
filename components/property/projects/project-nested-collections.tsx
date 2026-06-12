"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import type {
  HouseholdMemberItem,
  ListHouseholdMembersResponse,
  ProjectLinkResponse,
  ProjectResponse,
  ProjectAttachmentResponse,
  ProjectTaskResponse,
  ProjectTaskStatus,
} from "@/api/generated";
import {
  addPropertyProjectAttachmentMutation,
  addPropertyProjectLinkMutation,
  addPropertyProjectTaskMutation,
  deletePropertyProjectTaskMutation,
  getPropertyProjectQueryKey,
  getPropertyProjectTasksQueryKey,
  listHouseholdMembersOptions,
  removePropertyProjectAttachmentMutation,
  removePropertyProjectLinkMutation,
  reorderPropertyProjectTasksMutation,
  updatePropertyProjectTaskMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import {
  zProjectLinkRequest,
  zProjectTaskRequest,
} from "@/api/generated/zod.gen";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
import { Money, MoneyInput } from "@/components/economy/money";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { isValidMoneyAmount, toMoneyRequest } from "@/lib/economy/money";
import { formatDateOnly } from "@/lib/property/dates";
import {
  ATTACHMENT_ACCEPT,
  validateAttachmentFile,
} from "@/lib/property/attachment";
import { PROJECT_TASK_STATUS_OPTIONS } from "@/lib/property/enums";

const TASK_TITLE_MAX = 160;
const LINK_LABEL_MAX = 160;

type ProjectNestedCollectionsProps = {
  project: ProjectResponse;
  householdId: string;
  householdSlug: string;
  canWrite: boolean;
};

function invalidateProjectCollections(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  householdId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getPropertyProjectQueryKey({
        path: { projectId },
        query: { householdId },
      }),
    }),
    queryClient.invalidateQueries({
      queryKey: getPropertyProjectTasksQueryKey({
        path: { projectId },
        query: { householdId },
      }),
    }),
  ]);
}

function activeMembers(members: HouseholdMemberItem[]) {
  return members.filter(
    (member) => member.userId !== null && !member.isAnonymized,
  );
}

function memberLabel(member: HouseholdMemberItem) {
  return member.displayName ?? member.email ?? member.userId ?? "";
}

export function ProjectNestedCollections({
  project,
  householdId,
  householdSlug,
  canWrite,
}: ProjectNestedCollectionsProps) {
  return (
    <div className="grid gap-6">
      <ProjectTasksSection
        project={project}
        householdId={householdId}
        householdSlug={householdSlug}
        canWrite={canWrite}
      />
      <ProjectLinksSection
        projectId={project.projectId}
        householdId={householdId}
        links={project.links}
        canWrite={canWrite}
      />
      <ProjectAttachmentsSection
        projectId={project.projectId}
        householdId={householdId}
        attachments={project.attachments}
        canWrite={canWrite}
      />
    </div>
  );
}

function ProjectTasksSection({
  project,
  householdId,
  householdSlug,
  canWrite,
}: {
  project: ProjectResponse;
  householdId: string;
  householdSlug: string;
  canWrite: boolean;
}) {
  const t = useTranslations("property.projects.detail.tasks");
  const tasks = useMemo(
    () =>
      [...project.tasks].sort(
        (a, b) => Number(a.sortOrder) - Number(b.sortOrder),
      ),
    [project.tasks],
  );

  return (
    <section className="grid gap-3 border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-2">
          {tasks.map((task, index) => (
            <ProjectTaskRow
              key={task.taskId}
              task={task}
              tasks={tasks}
              index={index}
              householdId={householdId}
              projectId={project.projectId}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}
      {canWrite ? (
        <ProjectTaskForm
          projectId={project.projectId}
          householdId={householdId}
          householdSlug={householdSlug}
        />
      ) : null}
    </section>
  );
}

function ProjectTaskRow({
  task,
  tasks,
  index,
  householdId,
  projectId,
  canWrite,
}: {
  task: ProjectTaskResponse;
  tasks: ProjectTaskResponse[];
  index: number;
  householdId: string;
  projectId: string;
  canWrite: boolean;
}) {
  const t = useTranslations("property.projects.detail.tasks");
  const te = useTranslations("property.enums.taskStatus");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const reorderMutation = useMutation({
    ...reorderPropertyProjectTasksMutation(),
    onSuccess: async () => {
      await invalidateProjectCollections(queryClient, projectId, householdId);
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });
  const deleteMutation = useMutation({
    ...deletePropertyProjectTaskMutation(),
    onSuccess: async () => {
      await invalidateProjectCollections(queryClient, projectId, householdId);
      toast.success(t("deletedToast"));
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  const moveTask = (direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;
    const next = [...tasks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    reorderMutation.mutate({
      path: { projectId },
      body: {
        householdId,
        taskIds: next.map((item) => item.taskId),
      },
    });
  };

  if (editing) {
    return (
      <div className="border p-3">
        <ProjectTaskForm
          projectId={projectId}
          householdId={householdId}
          task={task}
          onCancel={() => setEditing(false)}
          onSuccess={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3 border p-3 sm:grid-cols-[1fr_auto]">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{task.title}</span>
          <span className="border px-2 py-0.5 text-xs">{te(task.status)}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {task.estimate ? <Money value={task.estimate} /> : t("noEstimate")}
          </span>
          <span>{formatDateOnly(task.dueDate) || t("noDueDate")}</span>
          <span>{task.assigneeId ? t("assigned") : t("unassigned")}</span>
        </div>
      </div>
      {canWrite ? (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("moveUp")}
            disabled={index === 0 || reorderMutation.isPending}
            onClick={() => moveTask("up")}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("moveDown")}
            disabled={index === tasks.length - 1 || reorderMutation.isPending}
            onClick={() => moveTask("down")}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            {t("edit")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button type="button" variant="ghost" size="icon-sm">
                  <Trash2Icon />
                  <span className="sr-only">{t("delete")}</span>
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteDescription", { title: task.title })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() =>
                    deleteMutation.mutate({
                      path: { projectId, taskId: task.taskId },
                      query: { householdId },
                    })
                  }
                >
                  {deleteMutation.isPending ? t("deleting") : t("delete")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : null}
    </div>
  );
}

function ProjectTaskForm({
  projectId,
  householdId,
  householdSlug,
  task,
  onCancel,
  onSuccess,
}: {
  projectId: string;
  householdId: string;
  householdSlug?: string;
  task?: ProjectTaskResponse;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const t = useTranslations("property.projects.detail.tasks");
  const te = useTranslations("property.enums.taskStatus");
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(task);
  const { data: membersData } = useQuery({
    ...listHouseholdMembersOptions({
      path: { householdRef: householdSlug ?? "" },
    }),
    enabled: Boolean(householdSlug),
  });
  const members = activeMembers(
    (membersData as ListHouseholdMembersResponse | undefined)?.members ?? [],
  );

  const handleSuccess = async () => {
    await invalidateProjectCollections(queryClient, projectId, householdId);
    toast.success(isEdit ? t("updatedToast") : t("createdToast"));
    if (!isEdit) form.reset();
    onSuccess?.();
  };
  const handleError = (error: unknown) => {
    const problem = error as unknown as ProblemDetails;
    const errors = mapProblemToFieldErrors(problem);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    handleProblem(problem);
  };
  const addMutation = useMutation({
    ...addPropertyProjectTaskMutation(),
    onSuccess: handleSuccess,
    onError: handleError,
  });
  const updateMutation = useMutation({
    ...updatePropertyProjectTaskMutation(),
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const form = useForm({
    defaultValues: {
      title: task?.title ?? "",
      status: (task?.status ?? "Todo") as ProjectTaskStatus,
      estimate:
        task?.estimate?.amount == null ? "" : String(task.estimate.amount),
      assigneeId: task?.assigneeId ?? "",
      dueDate: task?.dueDate ?? "",
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      const title = value.title.trim();
      if (!title) {
        setFieldErrors({ title: t("titleRequired") });
        return;
      }
      const rawEstimate = value.estimate.trim();
      if (rawEstimate && !isValidMoneyAmount(rawEstimate)) {
        setFieldErrors({ estimate: t("invalidEstimate") });
        return;
      }
      const parsed = zProjectTaskRequest.safeParse({
        householdId,
        title,
        status: value.status,
        estimate: rawEstimate ? toMoneyRequest(rawEstimate) : null,
        assigneeId: value.assigneeId || null,
        dueDate: value.dueDate || null,
      });
      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors;
        setFieldErrors(
          Object.fromEntries(
            Object.entries(flat).map(([field, messages]) => [
              field,
              messages?.[0] ?? t("invalidField"),
            ]),
          ),
        );
        return;
      }
      if (task) {
        await updateMutation.mutateAsync({
          path: { projectId, taskId: task.taskId },
          body: parsed.data,
        });
      } else {
        await addMutation.mutateAsync({
          path: { projectId },
          body: parsed.data,
        });
      }
    },
  });
  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup className="grid gap-3 md:grid-cols-2">
        <form.Field name="title">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.title)}>
              <FieldLabel htmlFor={field.name}>{t("formTitle")}</FieldLabel>
              <FieldContent>
                <Input
                  id={field.name}
                  maxLength={TASK_TITLE_MAX}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.title)}
                />
                <FieldError>{fieldErrors.title}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>
        <form.Field name="status">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>{t("status")}</FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value) field.handleChange(value as ProjectTaskStatus);
                  }}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TASK_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {te(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        </form.Field>
        <form.Field name="estimate">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.estimate)}>
              <FieldLabel htmlFor={field.name}>{t("estimate")}</FieldLabel>
              <FieldContent>
                <MoneyInput
                  id={field.name}
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                  aria-invalid={Boolean(fieldErrors.estimate)}
                />
                <FieldError>{fieldErrors.estimate}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>
        <form.Field name="dueDate">
          {(field) => (
            <Field data-invalid={Boolean(fieldErrors.dueDate)}>
              <FieldLabel htmlFor={field.name}>{t("dueDate")}</FieldLabel>
              <FieldContent>
                <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.dueDate)}
                />
                <FieldError>{fieldErrors.dueDate}</FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>
        <form.Field name="assigneeId">
          {(field) => (
            <Field className="md:col-span-2">
              <FieldLabel htmlFor={field.name}>{t("assignee")}</FieldLabel>
              <FieldContent>
                <Select
                  value={field.state.value || "unassigned"}
                  onValueChange={(value) =>
                    field.handleChange(
                      !value || value === "unassigned" ? "" : value,
                    )
                  }
                  disabled={!householdSlug}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      {t("unassigned")}
                    </SelectItem>
                    {members.map((member) => {
                      const userId = member.userId;
                      if (userId === null) return null;
                      return (
                        <SelectItem key={userId} value={userId}>
                          {memberLabel(member)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : null}
        <Button type="submit" disabled={isPending}>
          <PlusIcon />
          <span>{isPending ? t("saving") : isEdit ? t("save") : t("add")}</span>
        </Button>
      </div>
    </form>
  );
}

function ProjectLinksSection({
  projectId,
  householdId,
  links,
  canWrite,
}: {
  projectId: string;
  householdId: string;
  links: ProjectLinkResponse[];
  canWrite: boolean;
}) {
  const t = useTranslations("property.projects.detail.links");
  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    ...removePropertyProjectLinkMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getPropertyProjectQueryKey({
          path: { projectId },
          query: { householdId },
        }),
      });
      toast.success(t("removedToast"));
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  return (
    <section className="grid gap-3 border p-4">
      <div>
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
      </div>
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-2">
          {links.map((link) => (
            <div
              key={link.linkId}
              className="grid gap-2 border p-3 sm:grid-cols-[1fr_auto]"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener"
                className="flex min-w-0 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
              >
                <LinkIcon className="size-4 shrink-0" />
                <span className="truncate">{link.label}</span>
                <ExternalLinkIcon className="size-3.5 shrink-0" />
              </a>
              {canWrite ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={removeMutation.isPending}
                  onClick={() =>
                    removeMutation.mutate({
                      path: { projectId, linkId: link.linkId },
                      query: { householdId },
                    })
                  }
                >
                  <Trash2Icon />
                  <span>{t("remove")}</span>
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {canWrite ? (
        <ProjectLinkForm projectId={projectId} householdId={householdId} />
      ) : null}
    </section>
  );
}

function ProjectLinkForm({
  projectId,
  householdId,
}: {
  projectId: string;
  householdId: string;
}) {
  const t = useTranslations("property.projects.detail.links");
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    ...addPropertyProjectLinkMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getPropertyProjectQueryKey({
          path: { projectId },
          query: { householdId },
        }),
      });
      toast.success(t("addedToast"));
      form.reset();
    },
    onError: (error) => {
      const problem = error as unknown as ProblemDetails;
      const errors = mapProblemToFieldErrors(problem);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      handleProblem(problem);
    },
  });

  const form = useForm({
    defaultValues: {
      label: "",
      url: "",
    },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      const parsed = zProjectLinkRequest.safeParse({
        householdId,
        label: value.label.trim(),
        url: value.url.trim(),
      });
      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors;
        setFieldErrors(
          Object.fromEntries(
            Object.entries(flat).map(([field, messages]) => [
              field,
              messages?.[0] ?? t("invalidField"),
            ]),
          ),
        );
        return;
      }
      await mutation.mutateAsync({
        path: { projectId },
        body: parsed.data,
      });
    },
  });

  return (
    <form
      className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="label">
        {(field) => (
          <Field data-invalid={Boolean(fieldErrors.label)}>
            <FieldLabel htmlFor={field.name}>{t("label")}</FieldLabel>
            <FieldContent>
              <Input
                id={field.name}
                maxLength={LINK_LABEL_MAX}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={Boolean(fieldErrors.label)}
              />
              <FieldError>{fieldErrors.label}</FieldError>
            </FieldContent>
          </Field>
        )}
      </form.Field>
      <form.Field name="url">
        {(field) => (
          <Field data-invalid={Boolean(fieldErrors.url)}>
            <FieldLabel htmlFor={field.name}>{t("url")}</FieldLabel>
            <FieldContent>
              <Input
                id={field.name}
                type="url"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={Boolean(fieldErrors.url)}
              />
              <FieldError>{fieldErrors.url}</FieldError>
            </FieldContent>
          </Field>
        )}
      </form.Field>
      <div className="flex items-end">
        <Button type="submit" disabled={mutation.isPending}>
          <PlusIcon />
          <span>{mutation.isPending ? t("saving") : t("add")}</span>
        </Button>
      </div>
    </form>
  );
}

function formatBytes(value: number | string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function projectAttachmentContentUrl(
  projectId: string,
  attachmentId: string,
  householdId: string,
) {
  const path = `/api/proxy/v1/property/projects/${encodeURIComponent(
    projectId,
  )}/attachments/${encodeURIComponent(attachmentId)}/content`;
  return `${path}?householdId=${encodeURIComponent(householdId)}`;
}

function ProjectAttachmentsSection({
  projectId,
  householdId,
  attachments,
  canWrite,
}: {
  projectId: string;
  householdId: string;
  attachments: ProjectAttachmentResponse[];
  canWrite: boolean;
}) {
  const t = useTranslations("property.projects.detail.attachments");
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    ...addPropertyProjectAttachmentMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getPropertyProjectQueryKey({
          path: { projectId },
          query: { householdId },
        }),
      });
      toast.success(t("uploadedToast"));
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });
  const removeMutation = useMutation({
    ...removePropertyProjectAttachmentMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getPropertyProjectQueryKey({
          path: { projectId },
          query: { householdId },
        }),
      });
      toast.success(t("removedToast"));
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  const uploadFile = (file: File) => {
    const validationError = validateAttachmentFile(file);
    if (validationError) {
      toast.error(t(`validation.${validationError}`));
      return;
    }
    addMutation.mutate({
      path: { projectId },
      query: { householdId },
      body: { file },
    });
  };

  return (
    <section className="grid gap-3 border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        {canWrite ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={addMutation.isPending}
            render={
              <label>
                <UploadIcon />
                <span>
                  {addMutation.isPending ? t("uploading") : t("upload")}
                </span>
                <input
                  type="file"
                  className="sr-only"
                  accept={ATTACHMENT_ACCEPT}
                  disabled={addMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (file) uploadFile(file);
                  }}
                />
              </label>
            }
          />
        ) : null}
      </div>
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-3">
          {attachments.map((attachment) => {
            const url = projectAttachmentContentUrl(
              projectId,
              attachment.attachmentId,
              householdId,
            );
            const isImage = attachment.contentType.startsWith("image/");
            return (
              <div
                key={attachment.attachmentId}
                className="grid gap-3 border p-3 md:grid-cols-[96px_1fr_auto]"
              >
                <div className="relative flex size-24 items-center justify-center overflow-hidden border bg-muted/30">
                  {isImage ? (
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <FileIcon className="size-8 text-muted-foreground" />
                  )}
                </div>
                <div className="grid content-center gap-1">
                  <p className="truncate text-sm font-medium">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attachment.contentType} · {formatBytes(attachment.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    render={
                      <a href={url} target="_blank" rel="noopener">
                        <DownloadIcon />
                        <span>{t("open")}</span>
                      </a>
                    }
                  />
                  {canWrite ? (
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button type="button" variant="ghost" size="icon-sm">
                            <Trash2Icon />
                            <span className="sr-only">{t("remove")}</span>
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("deleteTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("deleteDescription", {
                              name: attachment.fileName,
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={removeMutation.isPending}
                            onClick={() =>
                              removeMutation.mutate({
                                path: {
                                  projectId,
                                  attachmentId: attachment.attachmentId,
                                },
                                query: { householdId },
                              })
                            }
                          >
                            {removeMutation.isPending
                              ? t("removing")
                              : t("remove")}
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
