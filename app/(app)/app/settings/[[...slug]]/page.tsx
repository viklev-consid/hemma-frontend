import { redirect } from "next/navigation";

/**
 * Back-compat redirect for the pre-`/app/me/*` settings URLs.
 *
 * The settings tree moved from `/app/settings/*` to `/app/me/settings/*`
 * to consolidate personal-scope features under `/app/me`. Any inbound
 * link — email links, bookmarks, external docs — that still points at
 * the old path bounces here.
 *
 * Optional catch-all (`[[...slug]]`) so `/app/settings` and any
 * sub-path both match. We forward the sub-path verbatim; query strings
 * are preserved by Next's `redirect` semantics.
 */
export default async function LegacySettingsRedirect({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const sub = slug?.length ? `/${slug.join("/")}` : "";
  redirect(`/app/me/settings${sub}`);
}
