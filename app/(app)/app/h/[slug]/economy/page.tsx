import { redirect } from "next/navigation";

/**
 * Economy home → transactions (the daily-driver landing). The first-run gate in
 * the economy layout still applies, so an uninitialized household lands on
 * setup instead.
 */
export default async function EconomyIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/app/h/${slug}/economy/transactions`);
}
