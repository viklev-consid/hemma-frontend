"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  deleteEconomyCategorizationRuleMutation,
  listEconomyCategoriesOptions,
  listEconomyCategorizationRulesOptions,
  listEconomyCategorizationRulesQueryKey,
  setEconomyCategorizationRuleEnabledMutation,
} from "@/api/generated/@tanstack/react-query.gen";
import type { CategorizationRuleResponse } from "@/api/generated";
import { handleProblem, type ProblemDetails } from "@/api/problems";
import { CategorizationRuleForm } from "@/components/economy/categorization-rule-form";
import { RulesListSkeleton } from "@/components/economy/economy-skeletons";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { flattenCategories } from "@/lib/economy/category-tree";
import {
  enabledRuleCount,
  isAtRuleCap,
  RULE_ENABLED_CAP,
  RULE_MATCH,
} from "@/lib/economy/categorization-rule";
import { useHousehold } from "@/lib/household-context";

/**
 * Categorization rules manager: list + create/edit/enable/delete. Rules are
 * household-wide and membership-gated. The "X / 100 enabled" badge and the cap
 * enforcement are client-derived (no server enabled-count); the backend stays
 * authoritative and 422s past the cap. Mobile-first cards.
 */
export function RulesPage() {
  const t = useTranslations("economy.rules");
  const { householdId } = useHousehold();
  const [createOpen, setCreateOpen] = useState(false);

  const rulesQuery = useQuery(
    listEconomyCategorizationRulesOptions({ query: { householdId } }),
  );
  const categoriesQuery = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );

  const rules = rulesQuery.data?.rules ?? [];
  const categoryName = useMemo(
    () =>
      new Map(
        flattenCategories(categoriesQuery.data?.categories ?? []).map((f) => [
          f.category.categoryId,
          f.category.name,
        ]),
      ),
    [categoriesQuery.data],
  );

  const enabledCount = enabledRuleCount(rules);
  const atCap = isAtRuleCap(rules);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={atCap ? "destructive" : "secondary"}>
            {t("cap", { count: enabledCount, max: RULE_ENABLED_CAP })}
          </Badge>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger
              render={
                <Button size="sm" disabled={atCap}>
                  <PlusIcon />
                  {t("add")}
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("form.createTitle")}</DialogTitle>
              </DialogHeader>
              <CategorizationRuleForm
                onSuccess={() => setCreateOpen(false)}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {atCap ? (
        <p className="text-xs text-muted-foreground">{t("capHint")}</p>
      ) : null}

      {rulesQuery.isLoading ? (
        <RulesListSkeleton />
      ) : rules.length === 0 ? (
        <Empty>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </Empty>
      ) : (
        <ul className="grid gap-2">
          {rules.map((rule) => (
            <RuleRow
              key={rule.categorizationRuleId}
              rule={rule}
              categoryLabel={
                categoryName.get(rule.targetCategoryId) ?? t("unknownCategory")
              }
              atCap={atCap}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  categoryLabel,
  atCap,
}: {
  rule: CategorizationRuleResponse;
  categoryLabel: string;
  atCap: boolean;
}) {
  const t = useTranslations("economy.rules");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const [editOpen, setEditOpen] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: listEconomyCategorizationRulesQueryKey({
        query: { householdId },
      }),
    });
  const onError = (error: unknown) =>
    handleProblem(error as unknown as ProblemDetails);

  const enabledMutation = useMutation({
    ...setEconomyCategorizationRuleEnabledMutation(),
    onSuccess: async () => {
      await invalidate();
    },
    onError,
  });
  const deleteMutation = useMutation({
    ...deleteEconomyCategorizationRuleMutation(),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("deleted"));
    },
    onError,
  });

  // At the cap, only allow toggling a rule OFF — turning one ON is blocked
  // client-side (the backend 422s as the backstop). An already-enabled rule
  // can always be switched off.
  const toggleDisabled = enabledMutation.isPending || (atCap && !rule.enabled);
  const isRegex = rule.match === RULE_MATCH.Regex;

  return (
    <li className="flex items-center justify-between gap-4 border px-3 py-2.5">
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isRegex ? "default" : "secondary"}>
            {t(`match.${rule.match}`)}
          </Badge>
          <code className="truncate text-sm">{rule.pattern}</code>
        </div>
        <span className="text-xs text-muted-foreground">
          {`${t("targetCategory")}: ${categoryLabel}`}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Switch
          aria-label={t("toggleEnabled")}
          checked={rule.enabled}
          disabled={toggleDisabled}
          onCheckedChange={(enabled) =>
            void enabledMutation.mutateAsync({
              path: { ruleId: rule.categorizationRuleId },
              body: { householdId, enabled },
            })
          }
        />

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger
            render={
              <Button size="icon" variant="ghost" aria-label={t("edit")}>
                <PencilIcon />
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("form.editTitle")}</DialogTitle>
            </DialogHeader>
            <CategorizationRuleForm
              rule={rule}
              onSuccess={() => setEditOpen(false)}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button size="icon" variant="ghost" aria-label={t("delete")}>
                <Trash2Icon />
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteConfirm.description", { pattern: rule.pattern })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("deleteConfirm.cancel")}</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate({
                    path: { ruleId: rule.categorizationRuleId },
                    query: { householdId },
                  })
                }
              >
                {deleteMutation.isPending
                  ? t("deleteConfirm.deleting")
                  : t("deleteConfirm.confirm")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
