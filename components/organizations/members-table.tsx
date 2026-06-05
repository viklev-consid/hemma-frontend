"use client";

import "@/api/client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";

import {
  listOrganizationMembersOptions,
  listOrganizationMembersQueryKey,
  listMyOrganizationsQueryKey,
  removeOrganizationMemberMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { OrganizationMemberItem } from "@/api/generated";
import { handleProblem, type ProblemDetails } from "@/api/problems";
import { useAuth } from "@/components/auth-provider";
import { OrgRoleBadge } from "@/components/organizations/org-role-badge";
import { RoleChangeDialog } from "@/components/organizations/role-change-dialog";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
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
import { roleRank } from "@/lib/org-roles";

const columnHelper = createColumnHelper<OrganizationMemberItem>();

type PendingDialog =
  | { kind: "none" }
  | {
      kind: "role";
      userId: string;
      userName: string;
      currentRole: string;
    }
  | {
      kind: "remove";
      userId: string;
      userName: string;
      isSelf: boolean;
    };

export function MembersTable() {
  const t = useTranslations("organizations.members.table");
  const tActions = useTranslations("organizations.members.actions");
  const org = useOrg();
  const { currentUser } = useAuth();
  const canManage = useCanInActiveOrg(ORG_PERMISSION.MembersManage);

  const [dialog, setDialog] = useState<PendingDialog>({ kind: "none" });

  const { data, isLoading } = useQuery(
    listOrganizationMembersOptions({
      path: { organizationRef: org.slug },
    }),
  );

  // Memoise to keep array identity stable across renders — otherwise every
  // render produces a fresh [] when data is undefined, invalidating
  // downstream useMemo dependencies.
  const members = useMemo(() => data?.members ?? [], [data?.members]);
  const callerRole = org.role ?? "";
  const callerRank = roleRank(callerRole);

  // Last-owner protection: if exactly one active owner remains, hide
  // Leave/Remove/Demote affordances on that row. The backend also enforces
  // this with Organizations.Owner.LastOwnerRequired — we just don't let
  // the user click a button that's guaranteed to fail.
  //
  // TODO(org-pagination): this count assumes the members listing is
  // unpaginated, which is the case in v1 — the API returns every member
  // in a single response. If pagination is added later, an owner on a
  // subsequent page would not be counted here and the guard could permit
  // demoting/removing what looks like the last owner on page 1. When
  // that happens, swap this for a server-provided `ownerCount` on the
  // list response (or a dedicated `GET /organizations/{ref}/owners/count`
  // endpoint). Tracked in docs/follow-ups.md.
  const activeOwnerCount = useMemo(
    () =>
      members.filter((m) => !m.isAnonymized && m.role.toLowerCase() === "owner")
        .length,
    [members],
  );

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "member",
        header: t("columns.member"),
        cell: ({ row }) => <MemberCell member={row.original} />,
      }),
      columnHelper.accessor("role", {
        header: t("columns.role"),
        cell: ({ getValue }) => <OrgRoleBadge role={getValue()} />,
      }),
      columnHelper.accessor("joinedAt", {
        header: t("columns.joined"),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground tabular-nums">
            {new Date(getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">{t("columns.actions")}</span>,
        cell: ({ row }) => {
          const member = row.original;
          // userId went nullable in the May 2026 backend update — represents
          // a fully-erased member with no actionable identity. Without a
          // userId we can't address mutation endpoints, so this branch is
          // off the table entirely.
          if (member.userId === null || member.isAnonymized) return null;
          const memberUserId = member.userId;

          const isSelf = currentUser?.userId === memberUserId;
          const memberRank = roleRank(member.role);
          const isOnlyOwner =
            member.role.toLowerCase() === "owner" && activeOwnerCount <= 1;

          // Affordance rules:
          // - Non-managers see no actions at all.
          // - Self always sees a "Leave" affordance (gated by last-owner).
          // - Caller can change role of strictly-lower-rank members only.
          // - Caller can remove strictly-lower-rank members (or self).
          const canChangeThisRole =
            canManage && !isSelf && callerRank > memberRank && !isOnlyOwner;
          const canRemoveThis =
            !isSelf && canManage && callerRank > memberRank && !isOnlyOwner;
          const canLeave = isSelf && !isOnlyOwner;

          if (!canChangeThisRole && !canRemoveThis && !canLeave) return null;

          const displayName =
            member.displayName ?? member.email ?? memberUserId;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("rowActionsLabel", { name: displayName })}
                  >
                    <MoreHorizontalIcon />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {canChangeThisRole ? (
                  <DropdownMenuItem
                    onClick={() =>
                      setDialog({
                        kind: "role",
                        userId: memberUserId,
                        userName: displayName,
                        currentRole: member.role,
                      })
                    }
                  >
                    {tActions("changeRole")}
                  </DropdownMenuItem>
                ) : null}
                {canRemoveThis ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      setDialog({
                        kind: "remove",
                        userId: memberUserId,
                        userName: displayName,
                        isSelf: false,
                      })
                    }
                  >
                    {tActions("remove")}
                  </DropdownMenuItem>
                ) : null}
                {canLeave ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      setDialog({
                        kind: "remove",
                        userId: memberUserId,
                        userName: displayName,
                        isSelf: true,
                      })
                    }
                  >
                    {tActions("leave")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    [t, tActions, canManage, activeOwnerCount, callerRank, currentUser?.userId],
  );

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[20vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{t("empty.title")}</EmptyTitle>
        <EmptyDescription>{t("empty.description")}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RoleChangeDialog
        open={dialog.kind === "role"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        userId={dialog.kind === "role" ? dialog.userId : ""}
        userName={dialog.kind === "role" ? dialog.userName : ""}
        currentRole={dialog.kind === "role" ? dialog.currentRole : ""}
      />

      <RemoveMemberDialog
        open={dialog.kind === "remove"}
        userId={dialog.kind === "remove" ? dialog.userId : ""}
        userName={dialog.kind === "remove" ? dialog.userName : ""}
        isSelf={dialog.kind === "remove" ? dialog.isSelf : false}
        onClose={() => setDialog({ kind: "none" })}
      />
    </>
  );
}

function MemberCell({ member }: { member: OrganizationMemberItem }) {
  const t = useTranslations("organizations.members.table");
  // Either flag (isAnonymized OR null displayName) collapses the row to a
  // tombstone. The backend should set both for GDPR-erased users; coding
  // to either is defensive per the API contract.
  const anonymized = member.isAnonymized || member.displayName === null;
  const name = anonymized
    ? t("anonymized")
    : (member.displayName ?? member.email ?? member.userId);
  const subtitle = anonymized ? null : member.email;
  const initial = anonymized ? "?" : (member.displayName?.[0] ?? "?");

  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarFallback>{initial.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="grid">
        <span
          className={
            anonymized
              ? "font-medium italic text-muted-foreground"
              : "font-medium"
          }
        >
          {name}
        </span>
        {subtitle ? (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
    </div>
  );
}

function RemoveMemberDialog({
  open,
  userId,
  userName,
  isSelf,
  onClose,
}: {
  open: boolean;
  userId: string;
  userName: string;
  isSelf: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("organizations.members.remove");
  const tCommon = useTranslations("common.actions");
  const org = useOrg();
  const queryClient = useQueryClient();
  const { replace } = useRouter();

  const mutation = useMutation({
    ...removeOrganizationMemberMutation(),
    onSuccess: async () => {
      toast.success(
        isSelf
          ? t("toast.leaveSuccess")
          : t("toast.removeSuccess", { name: userName }),
      );
      await queryClient.invalidateQueries({
        queryKey: listOrganizationMembersQueryKey({
          path: { organizationRef: org.slug },
        }),
      });
      if (isSelf) {
        // Leaving evicts our membership from /my; refresh that too so the
        // switcher updates and the post-leave route resolves correctly.
        await queryClient.invalidateQueries({
          queryKey: listMyOrganizationsQueryKey(),
        });
        // After we leave, we no longer have access to this org — route out
        // via the App Router so we don't pay for a full bundle re-boot.
        replace("/app");
      }
      onClose();
    },
    onError: (error) => {
      handleProblem(error as unknown as ProblemDetails);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSelf ? t("leaveTitle") : t("removeTitle", { name: userName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isSelf ? t("leaveDescription") : t("removeDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={() => {
              if (!userId) return;
              mutation.mutate({
                path: { organizationRef: org.slug, userId },
              });
            }}
            render={
              <Button type="button" variant="destructive">
                {mutation.isPending
                  ? t("submitting")
                  : isSelf
                    ? t("leaveAction")
                    : t("removeAction")}
              </Button>
            }
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Skeleton export for future suspense use.
export function MembersTableSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
