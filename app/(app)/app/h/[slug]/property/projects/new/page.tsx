import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { NewProjectPage } from "@/components/property/projects/new-project-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.property");
  return { title: t("projectNew") };
}

export default function PropertyNewProjectPage() {
  return <NewProjectPage />;
}
