"use client";

import "@/api/client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  changeHouseholdMemberRoleMutation,
  listHouseholdMembersQueryKey,
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
import { useHousehold } from "@/lib/household-context";
import {
  formatRoleLabel,
  HOUSEHOLD_ROLES,
  rolesBelow,
} from "@/lib/household-roles";
import type { HouseholdRole } from "@/api/generated";

type RoleChangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRole: string;
};

/**
 * Change another member's role within the active household.
 *
 * Role options are filtered to `rolesBelow(callerRole)` — strictly lower
 * than the caller's rank. The backend enforces the same rule and returns
 * `Households.Role.EscalationForbidden` if violated, but trimming the
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
  const t = useTranslations("households.members.roleChange");
  const tCommon = useTranslations("common.actions");
  const household = useHousehold();
  const queryClient = useQueryClient();
  const [role, setRole] = useState(currentRole);

  // The caller's own role within this household. Undefined for platform-override
  // admins; in that case we can't enforce escalation client-side, so we
  // fall back to allowing all role tiers and rely on the backend's
  // EscalationForbidden response if the call would actually escalate.
  // An empty list here would dead-end the dialog for override admins, so
  // the fallback is the full HOUSEHOLD_ROLES, not [].
  const callerRole = household.role;
  const candidateRoles: HouseholdRole[] = callerRole
    ? rolesBelow(callerRole)
    : [...HOUSEHOLD_ROLES];

  const mutation = useMutation({
    ...changeHouseholdMemberRoleMutation(),
    onSuccess: async () => {
      toast.success(t("toast.title"), {
        description: t("toast.description", {
          name: userName,
          role: formatRoleLabel(role),
        }),
      });
      await queryClient.invalidateQueries({
        queryKey: listHouseholdMembersQueryKey({
          path: { householdRef: household.slug },
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
              path: { householdRef: household.slug, userId },
              body: { role: role as HouseholdRole },
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
