"use client";

import Link from "next/link";
import { ChevronsUpDownIcon, LogOutIcon, UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/components/auth-provider";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProfileMenu() {
  const t = useTranslations("app.shell");
  const { currentUser, logout } = useAuth();

  if (!currentUser) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            tooltip={currentUser.displayName}
            aria-label={t("profileMenu.label")}
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <UserAvatar user={currentUser} size="sm" />
            <div className="grid flex-1 text-left leading-tight">
              <span className="text-sm font-medium">
                {currentUser.displayName}
              </span>
              <span className="text-xs text-muted-foreground">
                {currentUser.email}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto !size-4 text-muted-foreground" />
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={8}
        className="min-w-56"
      >
        <div className="grid gap-0.5 px-2 py-2">
          <span className="text-sm font-medium">{currentUser.displayName}</span>
          <span className="text-xs text-muted-foreground">
            {currentUser.email}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/app/me/settings" />}>
            <UserIcon />
            {t("settings")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void logout();
          }}
        >
          <LogOutIcon />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
