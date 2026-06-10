"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { toast } from "sonner";

import type {
  SubscriptionLifecycleState,
  SubscriptionResponse,
} from "@/api/generated";
import {
  changeEconomySubscriptionLifecycleStateMutation,
  listEconomyAccountsOptions,
  listEconomySubscriptionsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { zChangeLifecycleStateRequest } from "@/api/generated/zod.gen";
import { handleProblem, type ProblemDetails } from "@/api/problems";
import { ChargeHistoryPanel } from "@/components/economy/charge-history-panel";
import { SubscriptionBoardSkeleton } from "@/components/economy/economy-skeletons";
import { Money } from "@/components/economy/money";
import { SubscriptionForm } from "@/components/economy/subscription-form";
import { invalidateAfterSubscriptionChange } from "@/components/economy/subscription-invalidation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatEconomyDate } from "@/lib/economy/period";
import {
  formatSubscriptionCadence,
  isTerminal,
  SUBSCRIPTION_LIFECYCLE_STATE,
} from "@/lib/economy/subscription";
import { subscriptionBoardParsers } from "@/lib/economy/subscription-filters";
import { useHousehold } from "@/lib/household-context";
import { cn } from "@/lib/utils";

/**
 * Subscription board: Active/Trial/Paused cards first, cancelled subscriptions
 * in a collapsed muted section (visible — the list is the only surface where
 * cancelled subscriptions appear; hiding them would orphan their linked
 * actuals). Observe-only: nothing here books or moves money. Membership-gated.
 */
export function SubscriptionsBoard() {
  const t = useTranslations("economy.subscriptions");
  const { householdId } = useHousehold();
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelledOpen, setCancelledOpen] = useState(false);
  // `?subscription=` is the expanded charge-history target (deep-linkable).
  // Collapsing or switching cards clears the page params back to defaults.
  const [{ subscription: expandedId }, setBoardState] = useQueryStates(
    subscriptionBoardParsers,
  );
  const toggleExpanded = (subscriptionId: string) => {
    void setBoardState({
      subscription: expandedId === subscriptionId ? null : subscriptionId,
      chargePage: null,
      chargePageSize: null,
    });
  };

  const { data: subscriptionsData, isLoading } = useQuery(
    listEconomySubscriptionsOptions({ query: { householdId } }),
  );
  const { data: accountsData } = useQuery(
    listEconomyAccountsOptions({ query: { householdId } }),
  );

  const subscriptions = subscriptionsData?.subscriptions ?? [];
  const accountName = useMemo(
    () =>
      new Map((accountsData?.accounts ?? []).map((a) => [a.accountId, a.name])),
    [accountsData],
  );

  const current = subscriptions.filter((s) => !isTerminal(s.lifecycleState));
  const cancelled = subscriptions.filter((s) => isTerminal(s.lifecycleState));

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          {t("add")}
        </Button>
      </header>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("form.title")}</DialogTitle>
            <DialogDescription>{t("form.description")}</DialogDescription>
          </DialogHeader>
          <SubscriptionForm
            onSuccess={() => setCreateOpen(false)}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <SubscriptionBoardSkeleton />
      ) : subscriptions.length === 0 ? (
        <Empty>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.description")}</EmptyDescription>
        </Empty>
      ) : (
        <>
          <ul className="grid gap-3">
            {current.map((subscription) => (
              <SubscriptionCard
                key={subscription.subscriptionId}
                subscription={subscription}
                accountLabel={
                  subscription.accountId
                    ? accountName.get(subscription.accountId)
                    : undefined
                }
                expanded={expandedId === subscription.subscriptionId}
                onToggle={() => toggleExpanded(subscription.subscriptionId)}
              />
            ))}
          </ul>

          {cancelled.length > 0 ? (
            <section className="grid gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-1.5 text-muted-foreground"
                aria-expanded={cancelledOpen}
                onClick={() => setCancelledOpen((open) => !open)}
              >
                <ChevronDownIcon
                  className={cn(
                    "size-4 transition-transform",
                    cancelledOpen ? "" : "-rotate-90",
                  )}
                />
                {t("cancelledSection", { count: cancelled.length })}
              </Button>
              {cancelledOpen ? (
                <ul className="grid gap-3 opacity-70">
                  {cancelled.map((subscription) => (
                    <SubscriptionCard
                      key={subscription.subscriptionId}
                      subscription={subscription}
                      accountLabel={
                        subscription.accountId
                          ? accountName.get(subscription.accountId)
                          : undefined
                      }
                      expanded={expandedId === subscription.subscriptionId}
                      onToggle={() =>
                        toggleExpanded(subscription.subscriptionId)
                      }
                    />
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function SubscriptionCard({
  subscription,
  accountLabel,
  expanded,
  onToggle,
}: {
  subscription: SubscriptionResponse;
  accountLabel?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("economy.subscriptions");
  const terminal = isTerminal(subscription.lifecycleState);

  return (
    <li className="grid gap-3 border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">
              {subscription.name}
            </span>
            <LifecycleBadge subscription={subscription} />
          </div>
          <span className="text-xs text-muted-foreground">
            {formatSubscriptionCadence(subscription, (key, values) =>
              t(`cadence.${key}`, values),
            )}
            {" · "}
            {t("card.startsOn", {
              date: formatEconomyDate(subscription.startsOn),
            })}
          </span>
          {accountLabel ? (
            <span className="text-xs text-muted-foreground">
              {`${t("card.account")}: ${accountLabel}`}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Money
            value={subscription.expectedAmount}
            className="text-sm font-medium"
          />
          {terminal ? null : <StateMenu subscription={subscription} />}
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            {t("card.charges")}
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                expanded ? "" : "-rotate-90",
              )}
            />
          </Button>
        </div>
      </div>

      {expanded ? <ChargeHistoryPanel subscription={subscription} /> : null}
    </li>
  );
}

function LifecycleBadge({
  subscription,
}: {
  subscription: SubscriptionResponse;
}) {
  const t = useTranslations("economy.subscriptions");
  const { lifecycleState, trialEndsOn, cancelledOn } = subscription;

  if (lifecycleState === SUBSCRIPTION_LIFECYCLE_STATE.Cancelled) {
    // Subscriptions cancelled before the backend started recording the date
    // have `cancelledOn: null` — show a bare badge for those.
    return (
      <Badge variant="outline">
        {cancelledOn
          ? t("state.cancelledOn", { date: formatEconomyDate(cancelledOn) })
          : t("state.Cancelled")}
      </Badge>
    );
  }
  if (lifecycleState === SUBSCRIPTION_LIFECYCLE_STATE.Trial && trialEndsOn) {
    return (
      <Badge variant="default">
        {t("state.trialEnds", { date: formatEconomyDate(trialEndsOn) })}
      </Badge>
    );
  }
  return (
    <Badge
      variant={
        lifecycleState === SUBSCRIPTION_LIFECYCLE_STATE.Active
          ? "secondary"
          : "outline"
      }
    >
      {t(`state.${lifecycleState}`)}
    </Badge>
  );
}

/**
 * Per-card lifecycle menu. Never rendered on cancelled cards — `Cancelled` is
 * terminal and the backend rejects any further change. All four target states
 * are offered otherwise (back into Trial is legal); picking Trial requires a
 * `trialEndsOn` date, collected in a small dialog. Leaving Trial sends
 * `trialEndsOn: null` (required key; the server nulls it regardless).
 */
function StateMenu({ subscription }: { subscription: SubscriptionResponse }) {
  const t = useTranslations("economy.subscriptions");
  const queryClient = useQueryClient();
  const { householdId } = useHousehold();
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [trialEndsOn, setTrialEndsOn] = useState(
    subscription.trialEndsOn ?? "",
  );
  const [trialError, setTrialError] = useState<string | null>(null);

  const mutation = useMutation({
    ...changeEconomySubscriptionLifecycleStateMutation(),
    onSuccess: async () => {
      await invalidateAfterSubscriptionChange(queryClient, householdId);
      toast.success(t("stateMenu.changed"));
      setTrialDialogOpen(false);
    },
    onError: (error) => handleProblem(error as unknown as ProblemDetails),
  });

  const changeState = (
    lifecycleState: SubscriptionLifecycleState,
    trialDate: string | null,
  ) => {
    const parsed = zChangeLifecycleStateRequest.safeParse({
      householdId,
      lifecycleState,
      trialEndsOn: trialDate,
    });
    if (!parsed.success) {
      setTrialError(t("stateMenu.trialDateRequired"));
      return;
    }
    void mutation.mutateAsync({
      path: { subscriptionId: subscription.subscriptionId },
      body: parsed.data,
    });
  };

  const targets = Object.values(SUBSCRIPTION_LIFECYCLE_STATE).filter(
    (state) => state !== subscription.lifecycleState,
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="sm" variant="outline" disabled={mutation.isPending}>
              {t("stateMenu.trigger")}
              <ChevronDownIcon className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {targets.map((state) => (
            <DropdownMenuItem
              key={state}
              onClick={() => {
                if (state === SUBSCRIPTION_LIFECYCLE_STATE.Trial) {
                  setTrialError(null);
                  setTrialDialogOpen(true);
                  return;
                }
                changeState(state, null);
              }}
            >
              {t(`stateMenu.${state}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stateMenu.trialDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("stateMenu.trialDialogDescription", {
                name: subscription.name,
              })}
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(trialError)}>
            <FieldLabel htmlFor={`trial-ends-${subscription.subscriptionId}`}>
              {t("form.trialEndsOn.label")}
            </FieldLabel>
            <FieldContent>
              <Input
                id={`trial-ends-${subscription.subscriptionId}`}
                type="date"
                value={trialEndsOn}
                aria-invalid={Boolean(trialError)}
                onChange={(event) => setTrialEndsOn(event.target.value)}
              />
              <FieldError>{trialError}</FieldError>
            </FieldContent>
          </Field>
          <DialogFooter>
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                setTrialError(null);
                if (!trialEndsOn) {
                  setTrialError(t("stateMenu.trialDateRequired"));
                  return;
                }
                changeState(SUBSCRIPTION_LIFECYCLE_STATE.Trial, trialEndsOn);
              }}
            >
              {mutation.isPending
                ? t("form.submitting")
                : t("stateMenu.trialConfirm")}
            </Button>
            <Button
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => setTrialDialogOpen(false)}
            >
              {t("form.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
