import { redirect } from "next/navigation";

/**
 * Economy home → budget. The economy sub-nav has no standalone "home"; the
 * budget editor is the landing surface. The first-run gate in the economy
 * layout still applies, so an uninitialized household lands on setup instead.
 */
export default async function EconomyIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/app/h/${slug}/economy/budget`);
}
