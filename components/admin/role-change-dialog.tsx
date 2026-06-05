"use client";

import "@/api/client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { handleProblem, type ProblemDetails } from "@/api/problems";
import {
  changeUserRoleMutation,
  getUserByIdQueryKey,
  listUsersQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
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
import { GLOBAL_ROLE } from "@/lib/global-roles";

const ROLE_OPTIONS = [
  { value: GLOBAL_ROLE.Admin },
  { value: GLOBAL_ROLE.User },
] as const;

type RoleKey = (typeof ROLE_OPTIONS)[number]["value"];

export function RoleChangeDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRole: string;
}) {
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
  const t = useTranslations("adminComponents.roleChange");
  const tCommon = useTranslations("common.actions");
  const queryClient = useQueryClient();
  const [role, setRole] = useState(currentRole);

  const roleLabel = (value: string) =>
    (ROLE_OPTIONS as readonly { value: string }[]).some(
      (option) => option.value === value,
    )
      ? t(`roles.${value as RoleKey}`)
      : value;

  const mutation = useMutation({
    ...changeUserRoleMutation(),
    onSuccess: async () => {
      toast.success(t("toast.title"), {
        description: t("toast.description", {
          name: userName,
          role: roleLabel(role),
        }),
      });
      await queryClient.invalidateQueries({
        queryKey: getUserByIdQueryKey({ path: { userId } }),
      });
      await queryClient.invalidateQueries({ queryKey: listUsersQueryKey() });
      onClose();
    },
    onError: (error) => {
      handleProblem(error as unknown as ProblemDetails);
    },
  });

  const isDirty = role !== currentRole;

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
            if (value) {
              setRole(value);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(`roles.${option.value}`)}
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
              path: { userId },
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
