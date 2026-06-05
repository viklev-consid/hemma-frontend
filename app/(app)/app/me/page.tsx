import { redirect } from "next/navigation";

/**
 * Personal-scope landing.
 *
 * Today there's no standalone profile dashboard, so we send the user to
 * the settings page. When a profile view is added later, replace this
 * with that component (and reuse this redirect from the profile menu /
 * sidebar `/app/me` entries if any are added).
 */
export default function MeIndexPage() {
  redirect("/app/me/settings");
}
