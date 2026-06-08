import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { formatRoleLabel, isHouseholdRole } from "@/lib/household-roles";

/**
 * Renders a household role with a rank-aware visual treatment.
 *
 * Owner gets the primary variant; Member is muted. Unknown role strings (in
 * case the backend ships a new tier we haven't mapped) render as outlines so
 * they remain visible without claiming ranking they may not have.
 */
export function HouseholdRoleBadge({ role }: { role: string }) {
  const t = useTranslations("households.list.role");
  const normalised = role.toLowerCase();

  const variant: "default" | "secondary" | "outline" =
    normalised === "owner" ? "default" : isHouseholdRole(role) ? "secondary" : "outline";

  // Translation may not exist for unknown role strings — fall back to the
  // human-cased raw value.
  const label = isHouseholdRole(role)
    ? t(normalised as "owner" | "member")
    : formatRoleLabel(role);

  return <Badge variant={variant}>{label}</Badge>;
}
