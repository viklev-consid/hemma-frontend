import {
  ClipboardListIcon,
  MailIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export type AdminRouteLabelKey = "users" | "invitations" | "auditTrail";

export type AdminRoute = {
  href: string;
  labelKey: AdminRouteLabelKey;
  icon: LucideIcon;
  permission: string;
};

export const adminRoutes = [
  {
    href: "/app/admin/users",
    labelKey: "users",
    icon: UsersIcon,
    permission: "users.users.read",
  },
  {
    href: "/app/admin/invitations",
    labelKey: "invitations",
    icon: MailIcon,
    permission: "users.invitations.write",
  },
  {
    href: "/app/admin/audit",
    labelKey: "auditTrail",
    icon: ClipboardListIcon,
    permission: "audit.trail.read",
  },
] as const satisfies readonly AdminRoute[];
