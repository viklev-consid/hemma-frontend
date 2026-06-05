import { CreateOrgModal } from "@/components/organizations/create-org-modal";

/**
 * Intercepted route — matches `<Link href="/app/organizations/new">`
 * client-side navigations from anywhere inside `/app/...` and renders
 * the create-org form inside a Dialog over the current page.
 *
 * Hard refreshes / direct URL hits to `/app/organizations/new` bypass
 * this and render the standalone page (`app/(app)/app/organizations/new/page.tsx`).
 *
 * On the `(.)` matcher: slots aren't segments, so from the slot's
 * perspective `organizations` is one segment away — same level — hence
 * `(.)`. See `components/CLAUDE.md` for the full recipe.
 */
export default function InterceptedCreateOrgPage() {
  return <CreateOrgModal />;
}
