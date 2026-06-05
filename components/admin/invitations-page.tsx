"use client";

import "@/api/client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  createInvitationMutation,
  listInvitationsOptions,
  listInvitationsQueryKey,
  revokeInvitationMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { ListInvitationsInvitationDto } from "@/api/generated";
import {
  handleProblem,
  mapProblemToFieldErrors,
  type ProblemDetails,
} from "@/api/problems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PENDING_STATUSES = new Set(["pending", "Pending"]);

function statusVariant(status: string) {
  if (PENDING_STATUSES.has(status)) return "secondary" as const;
  if (status.toLowerCase() === "accepted") return "default" as const;
  return "outline" as const;
}

function safeParse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

type InvitationStatus =
  | { kind: "expired"; variant: "destructive" }
  | {
      kind: "other";
      rawLabel: string;
      variant: "secondary" | "default" | "outline";
    };

function describeStatus(
  invitation: ListInvitationsInvitationDto,
  now: number,
): InvitationStatus {
  if (PENDING_STATUSES.has(invitation.status)) {
    const expiresAt = safeParse(invitation.expiresAt);
    if (expiresAt && expiresAt.getTime() < now) {
      return { kind: "expired", variant: "destructive" };
    }
  }
  return {
    kind: "other",
    rawLabel: invitation.status,
    variant: statusVariant(invitation.status),
  };
}

export function InvitationsPage() {
  const t = useTranslations("adminComponents.invitations");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const invitationsQuery = useQuery(listInvitationsOptions());

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: ({ value }) => {
      setFieldErrors({});
      createMutation.mutate({ body: { email: value.email } });
    },
  });

  const createMutation = useMutation({
    ...createInvitationMutation(),
    onSuccess: async (response) => {
      const expiresAt = safeParse(response.expiresAt);
      toast.success(t("toast.sent.title"), {
        description: t("toast.sent.description", {
          email: response.email,
          when: expiresAt ? format.relativeTime(expiresAt) : response.expiresAt,
        }),
      });
      setFieldErrors({});
      form.reset();
      await queryClient.invalidateQueries({
        queryKey: listInvitationsQueryKey(),
      });
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

  const revokeMutation = useMutation({
    ...revokeInvitationMutation(),
    onSuccess: async (response) => {
      toast.success(t("toast.revoked.title"), {
        description: t("toast.revoked.description", { email: response.email }),
      });
      await queryClient.invalidateQueries({
        queryKey: listInvitationsQueryKey(),
      });
    },
    onError: (error) => {
      handleProblem(error as unknown as ProblemDetails);
    },
  });

  const invitations = invitationsQuery.data?.invitations ?? [];
  // Snapshot "now" once on mount; expiry comparisons don't need second-by-second freshness.
  const [now] = useState(() => Date.now());

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("send.title")}</CardTitle>
          <CardDescription>{t("send.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-xl gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.Field name="email">
                {(field) => (
                  <Field data-invalid={Boolean(fieldErrors.email)}>
                    <FieldLabel htmlFor={field.name}>
                      {t("send.emailLabel")}
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        autoComplete="off"
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={Boolean(fieldErrors.email)}
                      />
                      <FieldError>{fieldErrors.email}</FieldError>
                    </FieldContent>
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
            <div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? t("send.submitting")
                  : t("send.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invitationsQuery.isLoading ? (
            <div className="grid gap-2 p-4">
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
            </div>
          ) : invitations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("list.empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("list.columns.email")}</TableHead>
                  <TableHead>{t("list.columns.status")}</TableHead>
                  <TableHead>{t("list.columns.expires")}</TableHead>
                  <TableHead className="text-right">
                    {t("list.columns.action")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const status = describeStatus(invitation, now);
                  const isExpired = status.kind === "expired";
                  const isRevocable =
                    PENDING_STATUSES.has(invitation.status) && !isExpired;
                  const expiresAt = safeParse(invitation.expiresAt);
                  const isPast = expiresAt ? expiresAt.getTime() < now : false;
                  return (
                    <TableRow
                      key={invitation.invitationId}
                      className={isExpired ? "opacity-60" : undefined}
                    >
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          {status.kind === "expired"
                            ? t("status.expired")
                            : status.rawLabel}
                        </Badge>
                      </TableCell>
                      <TableCell
                        title={
                          expiresAt
                            ? format.dateTime(expiresAt, {
                                dateStyle: "long",
                                timeStyle: "medium",
                              })
                            : invitation.expiresAt
                        }
                      >
                        {expiresAt
                          ? t(isPast ? "expiry.past" : "expiry.future", {
                              when: format.relativeTime(expiresAt),
                            })
                          : invitation.expiresAt}
                      </TableCell>
                      <TableCell className="text-right">
                        {isRevocable ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              revokeMutation.mutate({
                                path: { invitationId: invitation.invitationId },
                              })
                            }
                            disabled={revokeMutation.isPending}
                          >
                            {t("revoke")}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            ·
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
