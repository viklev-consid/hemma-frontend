"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { listEconomyCategoriesOptions } from "@/api/generated/@tanstack/react-query.gen";
import type { CategoryResponse } from "@/api/generated";
import {
  AddCategoryDialog,
  type AddCategoryTarget,
} from "@/components/economy/add-category-dialog";
import { EconomyListSkeleton } from "@/components/economy/economy-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { useHousehold } from "@/lib/household-context";

/**
 * Categories tree. Roots may gain one level of subcategories; the depth-2 cap
 * is enforced in the UI by only offering "add subcategory" on root categories
 * (those with no `parentCategoryId`). The backend still rejects a third level,
 * and that rejection surfaces as a toast via the add dialog's mapper.
 *
 * Category names are user data, rendered verbatim. Membership-gated.
 */
export function CategoriesPage() {
  const t = useTranslations("economy.categories");
  const { householdId } = useHousehold();
  const [addTarget, setAddTarget] = useState<AddCategoryTarget | null>(null);

  const categoriesQuery = useQuery(
    listEconomyCategoriesOptions({ query: { householdId } }),
  );
  const categories = categoriesQuery.data?.categories ?? [];

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          size="sm"
          onClick={() => setAddTarget({ parentCategoryId: null })}
        >
          <PlusIcon />
          {t("addRoot")}
        </Button>
      </header>

      {categoriesQuery.isLoading ? (
        <EconomyListSkeleton />
      ) : categories.length === 0 ? (
        <Empty>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </Empty>
      ) : (
        <>
          <ul className="grid gap-3">
            {categories.map((category) => (
              <CategoryRow
                key={category.categoryId}
                category={category}
                onAddChild={setAddTarget}
              />
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("maxDepthHint")}</p>
        </>
      )}

      <AddCategoryDialog
        target={addTarget}
        onClose={() => setAddTarget(null)}
      />
    </div>
  );
}

function CategoryBadge({ budgetable }: { budgetable: boolean }) {
  const t = useTranslations("economy.categories");
  return (
    <Badge variant={budgetable ? "default" : "secondary"} className="w-fit">
      {budgetable ? t("budgetable") : t("tracked")}
    </Badge>
  );
}

function CategoryRow({
  category,
  onAddChild,
}: {
  category: CategoryResponse;
  onAddChild: (target: AddCategoryTarget) => void;
}) {
  const t = useTranslations("economy.categories");
  // Only roots can take a subcategory — a category that already has a parent is
  // at the max depth, so no "add subcategory" affordance is offered.
  const canAddChild = category.parentCategoryId === null;

  return (
    <li className="border">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="grid gap-0.5">
          <span className="text-sm font-medium">{category.name}</span>
          {!category.budgetable ? (
            <span className="text-xs text-muted-foreground">
              {t("trackedHint")}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <CategoryBadge budgetable={category.budgetable} />
          {canAddChild ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onAddChild({
                  parentCategoryId: category.categoryId,
                  parentName: category.name,
                })
              }
            >
              <PlusIcon />
              {t("addChild")}
            </Button>
          ) : null}
        </div>
      </div>

      {category.children.length > 0 ? (
        <ul className="border-t">
          {category.children.map((child) => (
            <li
              key={child.categoryId}
              className="flex items-center justify-between gap-3 py-2 pr-3 pl-6"
            >
              <div className="grid gap-0.5">
                <span className="text-sm">{child.name}</span>
                {!child.budgetable ? (
                  <span className="text-xs text-muted-foreground">
                    {t("trackedHint")}
                  </span>
                ) : null}
              </div>
              <CategoryBadge budgetable={child.budgetable} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
