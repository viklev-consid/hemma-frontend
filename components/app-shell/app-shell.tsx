"use client";

import { useState, type ReactNode } from "react";

import { AppHeader } from "@/components/app-shell/app-header";
import { AppSearchCommand } from "@/components/app-shell/app-search-command";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { ActiveOrgProvider } from "@/components/organizations/active-org-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <ActiveOrgProvider>
      <SidebarProvider>
        <AppSidebar onSearchOpen={() => setSearchOpen(true)} />
        <SidebarInset>
          <AppHeader />
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:px-6">
            {children}
          </div>
        </SidebarInset>
        <AppSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      </SidebarProvider>
    </ActiveOrgProvider>
  );
}
