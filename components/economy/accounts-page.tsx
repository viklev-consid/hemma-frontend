"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { getEconomyAccountBalancesOptions } from "@/api/generated/@tanstack/react-query.gen";
import { CreateAccountForm } from "@/components/economy/create-account-form";
import { EconomyListSkeleton } from "@/components/economy/economy-skeletons";
import { Money } from "@/components/economy/money";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const balancesQuery = useQuery(
    getEconomyAccountBalancesOptions({ query: { householdId } }),
  );
  const accounts = balancesQuery.data?.accounts ?? [];

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">{t("description")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("add.title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAccountForm />
        </CardContent>
      </Card>

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
