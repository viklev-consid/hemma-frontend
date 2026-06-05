import { Badge } from "@/components/ui/badge";

const adminRoles = new Set(["admin", "owner"]);

export function RoleBadge({ role }: { role: string }) {
  const normalized = role.toLowerCase();
  const variant = adminRoles.has(normalized) ? "default" : "secondary";
  return <Badge variant={variant}>{role}</Badge>;
}
