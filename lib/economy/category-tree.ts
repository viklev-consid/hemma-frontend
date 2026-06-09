import type { CategoryResponse } from "@/api/generated";

export type FlatCategory = { category: CategoryResponse; depth: number };

/**
 * Flatten the category tree into a depth-annotated list in tree order (each
 * root immediately followed by its descendants). Used for category pickers and
 * the budget table, where rows render indented by `depth`. Display only — no
 * math, no reshaping of the backend tree.
 */
export function flattenCategories(
  categories: CategoryResponse[],
  depth = 0,
): FlatCategory[] {
  return categories.flatMap((category) => [
    { category, depth },
    ...flattenCategories(category.children, depth + 1),
  ]);
}
