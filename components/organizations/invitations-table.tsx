"use client";

import "@/api/client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { MailPlusIcon, MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";

import {
  listOrganizationInvitationsOptions,
  listOrganizationInvitationsQueryKey,
  revokeOrganizationInvitationMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { OrganizationInvitationItem } from "@/api/generated";
import { handleProblem, type ProblemDetails } from "@/api/problems";
import { CreateInviteDialog } from "@/components/organizations/create-invite-dialog";
import { OrgRoleBadge } from "@/components/organizations/org-role-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrg } from "@/lib/org-context";
import { ORG_PERMISSION } from "@/lib/org-permission-strings";
import { useCanInActiveOrg } from "@/lib/active-org-permissions";

/**
 * Pending-invitations surface for the active organization.
 *
 * Reads invitations via the SDK (single-page listing — the API has no
 * pagination yet). Anyone with the `MembersRead` scope sees the list;
 * `InvitationsManage` gates the create button and the revoke action.
 */
export function InvitationsTable() {
  const t = useTranslations("organizations.invitations.table");
  const tActions = useTranslations("organizations.invitations.actions");
  const org = useOrg();
  const canManage = useCanInActiveOrg(ORG_PERMISSION.InvitationsManage);

  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] =
    useState<OrganizationInvitationItem | null>(null);

  const { data, isLoading } = useQuery(
    listOrganizationInvitationsOptions({
      path: { organizationRef: org.slug },
    }),
  );

  const invitations = data?.invitations ?? [];

  return (
    <section className="grid gap-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        {canManage ? (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <MailPlusIcon />
            <span>{t("createCta")}</span>
          </Button>
        ) : null}
      </header>

      {isLoading ? (
        <div className="grid min-h-[20vh] place-items-center">
          <Spinner />
        </div>
      ) : invitations.length === 0 ? (
        <Empty>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.email")}</TableHead>
                <TableHead>{t("columns.role")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.expires")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.invitationId}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell>
                    <OrgRoleBadge role={inv.role} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge invitation={inv} />
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && inv.isPending ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("rowActionsLabel", {
                                email: inv.email,
                              })}
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setRevokeTarget(inv)}
                          >
                            {tActions("revoke")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateInviteDialog open={createOpen} onOpenChange={setCreateOpen} />

      <RevokeInvitationDialog
        invitation={revokeTarget}
        onClose={() => setRevokeTarget(null)}
      />
    </section>
  );
}

function StatusBadge({
  invitation,
}: {
  invitation: OrganizationInvitationItem;
}) {
  const t = useTranslations("organizations.invitations.status");
  // `isPending` is the backend's authoritative signal. We deliberately
  // don't second-guess it client-side with a Date.now() comparison —
  // server-side timestamps drift, and the expiresAt column already shows
  // the user when it will run out.
  return invitation.isPending ? (
    <Badge variant="secondary">{t("pending")}</Badge>
  ) : (
    <Badge variant="outline">{t("consumed")}</Badge>
  );
}

function RevokeInvitationDialog({
  invitation,
  onClose,
}: {
  invitation: OrganizationInvitationItem | null;
  onClose: () => void;
}) {
  const t = useTranslations("organizations.invitations.revoke");
  const tCommon = useTranslations("common.actions");
  const org = useOrg();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    ...revokeOrganizationInvitationMutation(),
    onSuccess: async () => {
      toast.success(t("toast", { email: invitation?.email ?? "" }));
      await queryClient.invalidateQueries({
        queryKey: listOrganizationInvitationsQueryKey({
          path: { organizationRef: org.slug },
        }),
      });
      onClose();
    },
    onError: (error) => {
      handleProblem(error as unknown as ProblemDetails);
    },
  });

  const open = invitation !== null;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("title", { email: invitation?.email ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={() => {
              if (!invitation) return;
              mutation.mutate({
                path: {
                  organizationRef: org.slug,
                  invitationId: invitation.invitationId,
                },
              });
            }}
            render={
              <Button type="button" variant="destructive">
                {mutation.isPending ? t("submitting") : t("submit")}
              </Button>
            }
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
