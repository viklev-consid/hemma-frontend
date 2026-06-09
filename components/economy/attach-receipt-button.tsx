"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaperclipIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  attachEconomyTransactionReceiptMutation,
  listEconomyTransactionsQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { handleProblem, type ProblemDetails } from "@/api/problems";
import { Button } from "@/components/ui/button";
import { RECEIPT_ACCEPT, validateReceiptFile } from "@/lib/economy/receipt";
import { useHousehold } from "@/lib/household-context";

/**
 * Attach a receipt to an existing transaction (a list row with no receipt).
 * Validates type + size client-side before submit (WS0 helpers); the generated
 * mutation handles the multipart encoding. On success the transactions list is
 * invalidated so the row re-renders with its receipt indicator.
 */
export function AttachReceiptButton({
  transactionId,
}: {
  transactionId: string;
}) {
  const t = useTranslations("economy.transactions");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const inputRef = useRef<HTMLInputElement>(null);

  const attach = useMutation({
    ...attachEconomyTransactionReceiptMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: listEconomyTransactionsQueryKey({ query: { householdId } }),
      });
      toast.success(t("record.receiptAttached"));
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  function onPick(file: File | undefined) {
    if (!file) return;
    const problem = validateReceiptFile(file);
    if (problem) {
      toast.error(t(`record.receipt.error${capitalize(problem)}`));
      return;
    }
    attach.mutate({
      path: { transactionId },
      body: { householdId, file },
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={RECEIPT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          onPick(event.target.files?.[0]);
          // Reset so re-picking the same file fires onChange again.
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={attach.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <PaperclipIcon />
        {t("list.receipt.add")}
      </Button>
    </>
  );
}

function capitalize(value: string): "Type" | "Size" | "Empty" {
  return (value.charAt(0).toUpperCase() + value.slice(1)) as
    | "Type"
    | "Size"
    | "Empty";
}
