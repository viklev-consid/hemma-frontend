import {
  ActivityIcon,
  BellIcon,
  DatabaseIcon,
  KeyRoundIcon,
  MailIcon,
  ShieldIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";

export type SettingsRouteLabelKey =
  | "profile"
  | "password"
  | "email"
  | "security"
  | "activity"
  | "notifications"
  | "data";

export type SettingsRoute = {
  href: string;
  labelKey: SettingsRouteLabelKey;
  icon: LucideIcon;
};

export const settingsRoutes = [
  { href: "/app/me/settings", labelKey: "profile", icon: UserIcon },
  {
    href: "/app/me/settings/password",
    labelKey: "password",
    icon: KeyRoundIcon,
  },
  { href: "/app/me/settings/email", labelKey: "email", icon: MailIcon },
  { href: "/app/me/settings/security", labelKey: "security", icon: ShieldIcon },
  {
    href: "/app/me/settings/activity",
    labelKey: "activity",
    icon: ActivityIcon,
  },
  {
    href: "/app/me/settings/notifications",
    labelKey: "notifications",
    icon: BellIcon,
  },
  { href: "/app/me/settings/data", labelKey: "data", icon: DatabaseIcon },
] as const satisfies readonly SettingsRoute[];
