"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { getEconomyAccountBalancesOptions } from "@/api/generated/@tanstack/react-query.gen";
import { CreateAccountForm } from "@/components/economy/create-account-form";
import { EconomyListSkeleton } from "@/components/economy/economy-skeletons";
import { Money } from "@/components/economy/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { useHousehold } from "@/lib/household-context";

/**
 * Accounts surface. Renders the current balances (the balances read carries
 * name + type + current balance, a superset of the plain account list) and an
 * inline create form. SEK-only — opening balance is entered via `MoneyInput`,
 * never a currency picker. Membership-gated: any household role can manage
 * accounts.
 */
export function AccountsPage() {
  const t = useTranslations("economy.accounts");
  const { householdId } = useHousehold();
  const [createOpen, setCreateOpen] = useState(false);

  const balancesQuery = useQuery(
    getEconomyAccountBalancesOptions({ query: { householdId } }),
  );
  const accounts = balancesQuery.data?.accounts ?? [];

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          {t("add.trigger")}
        </Button>
      </header>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("add.title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <CreateAccountForm
            onCancel={() => setCreateOpen(false)}
            onSuccess={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {balancesQuery.isLoading ? (
        <EconomyListSkeleton />
      ) : accounts.length === 0 ? (
        <Empty>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </Empty>
      ) : (
        <ul className="grid gap-2">
          {accounts.map((account) => (
            <li
              key={account.accountId}
              className="flex items-center justify-between gap-4 border px-3 py-2.5"
            >
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">{account.name}</span>
                <Badge variant="secondary" className="w-fit">
                  {t(`type.${account.type}`)}
                </Badge>
              </div>
              <Money value={account.balance} className="text-sm font-medium" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
