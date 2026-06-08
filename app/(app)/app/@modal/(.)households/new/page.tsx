import { CreateHouseholdModal } from "@/components/households/create-household-modal";

/**
 * Intercepted route — matches `<Link href="/app/households/new">`
 * client-side navigations from anywhere inside `/app/...` and renders
 * the create-household form inside a Dialog over the current page.
 *
 * Hard refreshes / direct URL hits to `/app/households/new` bypass
 * this and render the standalone page (`app/(app)/app/households/new/page.tsx`).
 *
 * On the `(.)` matcher: slots aren't segments, so from the slot's
 * perspective `households` is one segment away — same level — hence
 * `(.)`. See `components/CLAUDE.md` for the full recipe.
 */
export default function InterceptedCreateHouseholdPage() {
  return <CreateHouseholdModal />;
}
