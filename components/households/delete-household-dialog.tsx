"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  deleteHouseholdMutation,
  listMyHouseholdsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import type { ListMyHouseholdsResponse } from "@/api/generated";
import { handleProblem, type ProblemDetails } from "@/api/problems";
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
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useHousehold } from "@/lib/household-context";

/**
 * Soft-delete the active household.
 *
 * Backend semantics:
 * - Soft delete is idempotent: a repeat call returns 204 and the row stays
 *   filtered out of GET/list endpoints. Treat 204 as success either way.
 * - There is no undelete in v1, so the confirm requires the user to retype
 *   the slug — the strongest "irreversible" signal we have.
 *
 * On success we evict the deleted row from `/my` directly (so the switcher
 * updates before the new query resolves), toast, and route to the household list.
 */
export function DeleteHouseholdDialog() {
  const t = useTranslations("households.settings.delete");
  const tCommon = useTranslations("common.actions");
  const household = useHousehold();
  const { push } = useRouter();
  const queryClient = useQueryClient();
  const [confirmSlug, setConfirmSlug] = useState("");

  const mutation = useMutation({
    ...deleteHouseholdMutation(),
    onSuccess: () => {
      // Optimistically drop the household from /my so the switcher and list page
      // reflect the deletion before the invalidation round-trip completes.
      const existing = queryClient.getQueryData<ListMyHouseholdsResponse>(
        listMyHouseholdsQueryKey(),
      );
      if (existing) {
        queryClient.setQueryData<ListMyHouseholdsResponse>(
          listMyHouseholdsQueryKey(),
          {
            households: existing.households.filter(
              (o) => o.householdId !== household.householdId,
            ),
          },
        );
      }
      void queryClient.invalidateQueries({
        queryKey: listMyHouseholdsQueryKey(),
      });
      toast.success(t("toast.deleted", { name: household.name }));
      push("/app");
    },
    onError: (error) => {
      handleProblem(error as unknown as ProblemDetails);
    },
  });

  const canDelete = confirmSlug === household.slug;

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive">
            <Trash2Icon />
            {t("trigger")}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            {t("confirmTitle", { name: household.name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("confirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="delete-household-confirm-slug">
            {t("confirmLabel")}
          </FieldLabel>
          <FieldContent>
            <Input
              id="delete-household-confirm-slug"
              value={confirmSlug}
              onChange={(event) => setConfirmSlug(event.target.value)}
            />
            <FieldDescription>/{household.slug}</FieldDescription>
          </FieldContent>
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmSlug("")}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!canDelete || mutation.isPending}
            onClick={() =>
              mutation.mutate({ path: { householdRef: household.slug } })
            }
          >
            {mutation.isPending ? t("deleting") : t("confirmAction")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
