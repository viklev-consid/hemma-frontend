import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AdminShell } from "@/components/admin/admin-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.admin");
  return { title: t("shell") };
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
