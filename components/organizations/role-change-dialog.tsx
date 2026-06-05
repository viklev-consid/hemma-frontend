"use client";

import "@/api/client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  changeOrganizationMemberRoleMutation,
  listOrganizationMembersQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { handleProblem, type ProblemDetails } from "@/api/problems";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrg } from "@/lib/org-context";
import {
  formatRoleLabel,
  ORG_ROLES,
  rolesBelow,
  type OrgRole,
} from "@/lib/org-roles";

type RoleChangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRole: string;
};

/**
 * Change another member's role within the active organization.
 *
 * Role options are filtered to `rolesBelow(callerRole)` — strictly lower
 * than the caller's rank. The backend enforces the same rule and returns
 * `Organizations.Role.EscalationForbidden` if violated, but trimming the
 * dropdown prevents the user from clicking through to a guaranteed error.
 */
export function RoleChangeDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentRole,
}: RoleChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <RoleChangeForm
            key={`${userId}:${currentRole}`}
            userId={userId}
            userName={userName}
            currentRole={currentRole}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RoleChangeForm({
  userId,
  userName,
  currentRole,
  onClose,
}: {
  userId: string;
  userName: string;
  currentRole: string;
  onClose: () => void;
}) {
  const t = useTranslations("organizations.members.roleChange");
  const tCommon = useTranslations("common.actions");
  const org = useOrg();
  const queryClient = useQueryClient();
  const [role, setRole] = useState(currentRole);

  // The caller's own role within this org. Undefined for platform-override
  // admins; in that case we can't enforce escalation client-side, so we
  // fall back to allowing all role tiers and rely on the backend's
  // EscalationForbidden response if the call would actually escalate.
  // An empty list here would dead-end the dialog for override admins, so
  // the fallback is the full ORG_ROLES, not [].
  const callerRole = org.role;
  const candidateRoles: OrgRole[] = callerRole
    ? rolesBelow(callerRole)
    : [...ORG_ROLES];

  const mutation = useMutation({
    ...changeOrganizationMemberRoleMutation(),
    onSuccess: async () => {
      toast.success(t("toast.title"), {
        description: t("toast.description", {
          name: userName,
          role: formatRoleLabel(role),
        }),
      });
      await queryClient.invalidateQueries({
        queryKey: listOrganizationMembersQueryKey({
          path: { organizationRef: org.slug },
        }),
      });
      onClose();
    },
    onError: (error) => {
      handleProblem(error as unknown as ProblemDetails);
    },
  });

  const isDirty = role.toLowerCase() !== currentRole.toLowerCase();

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>
          {t.rich("description", {
            name: userName,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 py-2">
        <Select
          value={role}
          onValueChange={(value) => {
            if (value) setRole(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {candidateRoles.map((option) => (
              <SelectItem key={option} value={option}>
                {formatRoleLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          {tCommon("cancel")}
        </Button>
        <Button
          onClick={() =>
            mutation.mutate({
              path: { organizationRef: org.slug, userId },
              body: { role },
            })
          }
          disabled={!isDirty || mutation.isPending}
        >
          {mutation.isPending ? t("submitting") : t("submit")}
        </Button>
      </DialogFooter>
    </>
  );
}
