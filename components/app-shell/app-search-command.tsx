"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GaugeIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/components/auth-provider";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { adminRoutes } from "@/lib/admin-routes";
import { settingsRoutes } from "@/lib/settings-routes";

export function AppSearchCommand({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { permissions } = useAuth();
  const t = useTranslations("app.shell.command");
  const tNav = useTranslations("app.shell");
  const tSettings = useTranslations("settings.nav");
  const tAdmin = useTranslations("admin.nav");

  useEffect(() => {
    function handle(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, onOpenChange]);

  const visibleAdmin = adminRoutes.filter((route) =>
    permissions.includes(route.permission),
  );

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
    >
      <Command>
        <CommandInput placeholder={t("placeholder")} />
        <CommandList>
          <CommandEmpty>{t("empty")}</CommandEmpty>
          <CommandGroup heading={t("pages")}>
            <CommandItem onSelect={() => go("/app")}>
              <GaugeIcon />
              <span>{tNav("dashboard")}</span>
            </CommandItem>
          </CommandGroup>
          {visibleAdmin.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t("administration")}>
                {visibleAdmin.map((route) => (
                  <CommandItem key={route.href} onSelect={() => go(route.href)}>
                    <route.icon />
                    <span>{tAdmin(route.labelKey)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          <CommandSeparator />
          <CommandGroup heading={t("settings")}>
            <CommandItem onSelect={() => go("/app/me/settings")}>
              <SettingsIcon />
              <span>{tNav("settings")}</span>
            </CommandItem>
            {settingsRoutes.slice(1).map((route) => (
              <CommandItem key={route.href} onSelect={() => go(route.href)}>
                <route.icon />
                <span>{tSettings(route.labelKey)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
