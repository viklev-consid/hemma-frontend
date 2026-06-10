"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { RecurringBillForm } from "@/components/economy/recurring-bill-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHousehold } from "@/lib/household-context";

export function RecurringBillDialogPage() {
  const t = useTranslations("economy.recurring");
  const { slug } = useHousehold();
  const { push } = useRouter();
  const listHref = `/app/h/${slug}/economy/recurring`;

  const close = () => push(listHref);

  return (
    <Dialog open onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("form.title")}</DialogTitle>
          <DialogDescription>{t("form.description")}</DialogDescription>
        </DialogHeader>
        <RecurringBillForm onCancel={close} onSuccess={close} />
      </DialogContent>
    </Dialog>
  );
}
