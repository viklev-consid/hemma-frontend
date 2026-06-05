import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { AuthHydration } from "@/components/auth-hydration";
import { LegalComplianceGate } from "@/components/legal/legal-compliance-gate";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthHydration>
      <AppShell>{children}</AppShell>
      <LegalComplianceGate />
    </AuthHydration>
  );
}
