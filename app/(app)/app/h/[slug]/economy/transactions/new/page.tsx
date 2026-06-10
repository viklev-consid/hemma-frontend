import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RecordTransactionDialogPage } from "@/components/economy/record-transaction-dialog-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.app.economy");
  return { title: t("transactionNew") };
}

export default async function RecordTransactionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RecordTransactionDialogPage slug={slug} />;
}
