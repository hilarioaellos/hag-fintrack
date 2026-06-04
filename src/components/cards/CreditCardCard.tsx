"use client";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Doc } from "@convex-api/dataModel";
import { CreditCardFormDialog } from "./CreditCardFormDialog";

type CreditCard = Doc<"fintrack_credit_cards"> & {
  account: Doc<"fintrack_accounts"> | null;
};

function daysUntilDay(dueDay: number): number {
  const today = new Date();
  const todayDay = today.getDate();
  if (dueDay >= todayDay) return dueDay - todayDay;
  const next = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  return Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
}

function utilizationColor(ratio: number): string {
  if (ratio >= 0.7) return "var(--color-ft-bad)";
  if (ratio >= 0.3) return "var(--color-ft-warn)";
  return "var(--color-ft-good)";
}

export function CreditCardCard({ card }: { card: CreditCard }) {
  const t = useTranslations("cards");
  const tc = useTranslations("common");
  const remove = useMutation(api.fintrack.cards.remove);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const account = card.account;
  const balanceCents = account ? Math.abs(account.balanceCents) : 0;
  const utilization = card.creditLimitCents > 0 ? balanceCents / card.creditLimitCents : 0;
  const utilizationPct = Math.min(utilization * 100, 100);
  const days = daysUntilDay(card.paymentDueDay);
  const currency = account?.currencyCode ?? "USD";

  const dueColor =
    days === 0
      ? "var(--color-ft-bad)"
      : days <= 3
      ? "var(--color-ft-warn)"
      : "var(--color-ft-text-2)";

  return (
    <>
      <div
        className="rounded-xl border p-5 flex flex-col gap-4 group relative"
        style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--color-ft-text)" }}>
              {account?.name ?? "—"}
            </p>
            {account?.bankName && (
              <p className="text-xs truncate" style={{ color: "var(--color-ft-text-3)" }}>
                {account.bankName}
              </p>
            )}
          </div>
          <div className="relative shrink-0">
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
                  className="absolute right-0 top-6 z-20 rounded-lg border shadow-lg py-1 min-w-[120px]"
                  style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)" }}
                >
                  <button
                    onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                    style={{ color: "var(--color-ft-text-2)" }}
                  >
                    <Pencil className="h-3 w-3" /> {t("editCard")}
                  </button>
                  <button
                    onClick={async () => { setMenuOpen(false); await remove({ id: card._id }); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                    style={{ color: "var(--color-ft-bad)" }}
                  >
                    <Trash2 className="h-3 w-3" /> {tc("delete")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Balance + Limit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("balance")}</p>
            <p className="font-bold ft-num mt-0.5" style={{ color: "var(--color-ft-bad)" }}>
              {formatMoney(balanceCents, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("creditLimit")}</p>
            <p className="font-bold ft-num mt-0.5" style={{ color: "var(--color-ft-text)" }}>
              {formatMoney(card.creditLimitCents, currency)}
            </p>
          </div>
        </div>

        {/* Utilization bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--color-ft-text-3)" }}>{t("utilization")}</span>
            <span className="font-mono" style={{ color: utilizationColor(utilization) }}>
              {utilizationPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-ft-border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${utilizationPct}%`, backgroundColor: utilizationColor(utilization) }}
            />
          </div>
        </div>

        {/* Closing + Due */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p style={{ color: "var(--color-ft-text-3)" }}>{t("closingDay")}</p>
            <p className="mt-0.5" style={{ color: "var(--color-ft-text-2)" }}>
              {t("closesOn", { day: card.closingDay })}
            </p>
          </div>
          <div>
            <p style={{ color: "var(--color-ft-text-3)" }}>{t("dueDay")}</p>
            <p className="mt-0.5 font-medium" style={{ color: dueColor }}>
              {days === 0 ? t("dueToday") : t("daysUntilDue", { days })}
            </p>
          </div>
        </div>

        {/* Min payment */}
        <div
          className="flex items-center justify-between pt-3 border-t"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("minPayment")}</span>
          <span className="text-sm font-mono font-medium" style={{ color: "var(--color-ft-text-2)" }}>
            {formatMoney(card.minimumPaymentCents, currency)}
          </span>
        </div>
      </div>

      <CreditCardFormDialog open={editOpen} onOpenChange={setEditOpen} card={card} />
    </>
  );
}
