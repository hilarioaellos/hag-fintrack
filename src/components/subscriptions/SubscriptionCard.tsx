"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreHorizontal, Pencil, XCircle, RefreshCw } from "lucide-react";
import type { Doc } from "@convex-api/dataModel";
import { SubscriptionFormDialog } from "./SubscriptionFormDialog";

type Subscription = Doc<"fintrack_subscriptions">;

// Monthly-equivalent cost for display purposes
function toMonthlyCents(amount: number, periodicity: Subscription["periodicity"]): number {
  switch (periodicity) {
    case "weekly": return Math.round((amount * 52) / 12);
    case "quarterly": return Math.round(amount / 3);
    case "annual": return Math.round(amount / 12);
    default: return amount; // monthly
  }
}

function RenewalBadge({ nextRenewalDate, isActive, t }: {
  nextRenewalDate: number;
  isActive: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!isActive) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border"
      style={{ color: "var(--color-ft-text-3)", borderColor: "var(--color-ft-border)" }}>
      {t("cancelled")}
    </span>
  );

  const now = Date.now();
  const msDay = 86_400_000;
  const diff = nextRenewalDate - now;
  const diffDays = Math.ceil(diff / msDay);

  if (diff < 0) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border"
      style={{ color: "var(--color-ft-bad)", borderColor: "var(--color-ft-bad)",
               backgroundColor: "color-mix(in srgb, var(--color-ft-bad) 10%, transparent)" }}>
      ⚠ {t("overdue")}
    </span>
  );
  if (diffDays === 0) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border"
      style={{ color: "var(--color-ft-warn)", borderColor: "var(--color-ft-warn)",
               backgroundColor: "color-mix(in srgb, var(--color-ft-warn) 10%, transparent)" }}>
      {t("dueToday")}
    </span>
  );
  if (diffDays <= 7) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border"
      style={{ color: "var(--color-ft-primary)", borderColor: "var(--color-ft-primary)",
               backgroundColor: "color-mix(in srgb, var(--color-ft-primary) 10%, transparent)" }}>
      {t("dueSoon")}
    </span>
  );
  return null;
}

export function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const t = useTranslations("subscriptions");
  const tc = useTranslations("common");
  const renewMutation = useMutation(api.fintrack.subscriptions.renew);
  const cancelMutation = useMutation(api.fintrack.subscriptions.cancel);
  const accounts = useQuery(api.fintrack.accounts.list);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const account = accounts?.find((a: Doc<"fintrack_accounts">) => a._id === subscription.accountId);
  const monthlyCents = toMonthlyCents(subscription.amount, subscription.periodicity);
  const isOverdue = subscription.nextRenewalDate < Date.now() && subscription.isActive;

  return (
    <>
      <div
        className="rounded-xl border p-5 flex flex-col gap-3 group relative"
        style={{
          backgroundColor: "var(--color-ft-surface)",
          borderColor: subscription.isActive ? "var(--color-ft-border)" : "var(--color-ft-border)",
          opacity: subscription.isActive ? 1 : 0.6,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--color-ft-text)" }}>
              {subscription.name}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--color-ft-text-3)" }}>
              {account?.name ?? "—"} · {t(`periodicity_${subscription.periodicity}`)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RenewalBadge nextRenewalDate={subscription.nextRenewalDate} isActive={subscription.isActive} t={t} />
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--color-ft-text-3)" }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-6 z-20 rounded-lg border shadow-lg py-1 min-w-[140px]"
                    style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)" }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                      style={{ color: "var(--color-ft-text-2)" }}
                    >
                      <Pencil className="h-3 w-3" /> {tc("edit")}
                    </button>
                    {subscription.isActive && (
                      <button
                        onClick={async () => {
                          setMenuOpen(false);
                          if (confirm(t("cancelConfirm"))) {
                            await cancelMutation({ id: subscription._id });
                          }
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                        style={{ color: "var(--color-ft-bad)" }}
                      >
                        <XCircle className="h-3 w-3" /> {t("cancel")}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div>
          <p className="text-xl font-bold ft-num" style={{ color: "var(--color-ft-text)" }}>
            {formatMoney(subscription.amount, subscription.currencyCode)}
          </p>
          {subscription.periodicity !== "monthly" && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-ft-text-3)" }}>
              ≈ {formatMoney(monthlyCents, subscription.currencyCode)}/{t("periodicity_monthly").toLowerCase()}
            </p>
          )}
        </div>

        {/* Next renewal */}
        <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--color-ft-border)" }}>
          <div>
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("nextRenewal")}</p>
            <p className="text-sm font-mono mt-0.5"
              style={{ color: isOverdue ? "var(--color-ft-bad)" : "var(--color-ft-text-2)" }}>
              {new Date(subscription.nextRenewalDate).toLocaleDateString()}
            </p>
          </div>
          {isOverdue && (
            <button
              onClick={async () => { await renewMutation({ id: subscription._id }); }}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
            >
              <RefreshCw className="h-3 w-3" />
              {t("renew")}
            </button>
          )}
        </div>
      </div>

      <SubscriptionFormDialog open={editOpen} onOpenChange={setEditOpen} subscription={subscription} />
    </>
  );
}
