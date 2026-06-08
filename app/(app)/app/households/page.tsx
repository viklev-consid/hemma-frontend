import { redirect } from "next/navigation";

/**
 * The standalone "list of households" page collapsed into the
 * cross-household dashboard at `/app`. The picker in the sidebar is the
 * canonical way to switch / browse / create from inside the app, and
 * the dashboard surfaces the same list for newcomers.
 *
 * Kept as a redirect (not deleted) so external links / bookmarks keep
 * working. Plan is to delete after one release.
 */
export default function HouseholdsListRedirect() {
  redirect("/app");
}
