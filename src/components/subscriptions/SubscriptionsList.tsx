"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionCard } from "./SubscriptionCard";
import { SubscriptionFormDialog } from "./SubscriptionFormDialog";
import type { Doc } from "@convex-api/dataModel";

type Subscription = Doc<"fintrack_subscriptions">;
type Filter = "active" | "cancelled" | "all";

function toMonthlyCents(amount: number, periodicity: Subscription["periodicity"]): number {
  switch (periodicity) {
    case "weekly": return Math.round((amount * 52) / 12);
    case "quarterly": return Math.round(amount / 3);
    case "annual": return Math.round(amount / 12);
    default: return amount; // monthly
  }
}

export function SubscriptionsList() {
  const t = useTranslations("subscriptions");
  const tc = useTranslations("common");
  const subscriptions = useQuery(api.fintrack.subscriptions.list);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("active");

  if (subscriptions === undefined) {
    return <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>;
  }

  const active = subscriptions.filter((s: Subscription) => s.isActive);
  const visible = filter === "all"
    ? [...subscriptions].sort((a, b) => a.nextRenewalDate - b.nextRenewalDate)
    : filter === "active"
    ? [...active].sort((a, b) => a.nextRenewalDate - b.nextRenewalDate)
    : subscriptions.filter((s: Subscription) => !s.isActive);

  // Monthly cost summary — active only, single currency
  const currencies = new Set(active.map((s: Subscription) => s.currencyCode));
  const singleCurrency = currencies.size === 1 ? active[0]?.currencyCode ?? null : null;
  const monthlyCost = singleCurrency
    ? active.reduce((sum: number, s: Subscription) => sum + toMonthlyCents(s.amount, s.periodicity), 0)
    : null;

  const FILTERS: Filter[] = ["active", "cancelled", "all"];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {monthlyCost !== null && singleCurrency && (
          <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>
            {t("monthlyCost")}:{" "}
            <span className="font-mono font-semibold" style={{ color: "var(--color-ft-bad)" }}>
              {formatMoney(monthlyCost, singleCurrency)}
            </span>
          </p>
        )}
        <Button
          onClick={() => setAddOpen(true)}
          className="ml-auto"
          style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {t("addSubscription")}
        </Button>
      </div>

      {/* Filter tabs */}
      {subscriptions.length > 0 && (
        <div className="flex gap-1.5">
          {FILTERS.map((f) => {
            const count = f === "all" ? subscriptions.length
              : f === "active" ? active.length
              : subscriptions.length - active.length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 text-xs rounded-full border transition-colors"
                style={{
                  backgroundColor: filter === f ? "var(--color-ft-primary)" : "var(--color-ft-surface-2)",
                  color: filter === f ? "#080d18" : "var(--color-ft-text-3)",
                  borderColor: filter === f ? "var(--color-ft-primary)" : "var(--color-ft-border)",
                }}
              >
                {f === "active" ? t("active") : f === "cancelled" ? t("cancelled") : tc("all")}
                <span className="ml-1.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cards */}
      {visible.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-10 flex flex-col items-center gap-2"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>
            {subscriptions.length === 0 ? t("noSubscriptions") : tc("noResults")}
          </p>
          {subscriptions.length === 0 && (
            <p className="text-xs text-center max-w-xs" style={{ color: "var(--color-ft-text-3)" }}>
              {t("noSubscriptionsHint")}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((s: Subscription) => (
            <SubscriptionCard key={s._id} subscription={s} />
          ))}
        </div>
      )}

      <SubscriptionFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
