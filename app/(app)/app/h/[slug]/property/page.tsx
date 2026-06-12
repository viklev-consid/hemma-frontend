import { redirect } from "next/navigation";

/**
 * Property home → projects (the daily-driver landing). The read-permission gate
 * in the property layout still applies, so a user without `property.data.read`
 * lands on the no-access state instead of the list.
 */
export default async function PropertyIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/app/h/${slug}/property/projects`);
}
