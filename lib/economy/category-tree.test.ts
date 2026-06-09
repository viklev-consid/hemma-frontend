import { describe, expect, it } from "vitest";

import type { CategoryResponse } from "@/api/generated";

import { flattenCategories } from "./category-tree";

function cat(
  categoryId: string,
  children: CategoryResponse[] = [],
): CategoryResponse {
  return {
    categoryId,
    name: categoryId,
    parentCategoryId: null,
    budgetable: true,
    children,
  };
}

describe("flattenCategories", () => {
  it("emits roots followed by their children with increasing depth", () => {
    const tree = [cat("food", [cat("groceries"), cat("dining")]), cat("rent")];
    const flat = flattenCategories(tree);
    expect(flat.map((f) => [f.category.categoryId, f.depth])).toEqual([
      ["food", 0],
      ["groceries", 1],
      ["dining", 1],
      ["rent", 0],
    ]);
  });

  it("returns an empty list for no categories", () => {
    expect(flattenCategories([])).toEqual([]);
  });
});
