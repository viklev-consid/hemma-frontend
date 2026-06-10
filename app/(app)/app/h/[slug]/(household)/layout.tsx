import type { ReactNode } from "react";

import { HouseholdShell } from "@/components/households/household-shell";

type LayoutProps = {
  children: ReactNode;
};

export default function HouseholdSectionLayout({ children }: LayoutProps) {
  return <HouseholdShell>{children}</HouseholdShell>;
}
