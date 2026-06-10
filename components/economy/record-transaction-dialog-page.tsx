"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { RecordTransactionForm } from "@/components/economy/record-transaction-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RecordTransactionDialogPage({ slug }: { slug: string }) {
  const t = useTranslations("economy.transactions");
  const { push } = useRouter();
  const listHref = `/app/h/${slug}/economy/transactions`;

  const close = () => push(listHref);

  return (
    <Dialog open onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("record.title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <RecordTransactionForm slug={slug} onCancel={close} onSuccess={close} />
      </DialogContent>
    </Dialog>
  );
}
