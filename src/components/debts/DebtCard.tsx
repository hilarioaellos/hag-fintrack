"use client";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreHorizontal, Pencil, Archive, ChevronDown, ChevronUp } from "lucide-react";
import type { Doc } from "@convex-api/dataModel";
import { DebtFormDialog } from "./DebtFormDialog";
import { AmortizationTable } from "./AmortizationTable";

type Debt = Doc<"fintrack_debts">;

export function DebtCard({ debt }: { debt: Debt }) {
  const t = useTranslations("debts");
  const tc = useTranslations("common");
  const archiveMutation = useMutation(api.fintrack.debts.archive);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAmortization, setShowAmortization] = useState(false);

  const aprDisplay = (debt.interestRateBps / 100).toFixed(2) + "%";

  const hasProgress =
    debt.type === "installment" &&
    debt.totalTermMonths != null &&
    debt.totalTermMonths > 0;
  const paidPct = hasProgress
    ? Math.min(100, Math.round(((debt.paidInstallments ?? 0) / debt.totalTermMonths!) * 100))
    : 0;
  const remaining = hasProgress
    ? debt.totalTermMonths! - (debt.paidInstallments ?? 0)
    : null;

  const periodicityKey = debt.paymentPeriodicity
    ? (`periodicity_${debt.paymentPeriodicity}` as const)
    : null;

  return (
    <>
      <div
        className="rounded-xl border p-5 flex flex-col gap-3 group relative"
        style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--color-ft-text)" }}>
              {debt.name}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--color-ft-text-3)" }}>
              {debt.lender}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                color: debt.type === "revolving" ? "var(--color-ft-warn)" : "var(--color-ft-primary)",
                borderColor: debt.type === "revolving" ? "var(--color-ft-warn)" : "var(--color-ft-primary)",
                backgroundColor: debt.type === "revolving"
                  ? "color-mix(in srgb, var(--color-ft-warn) 10%, transparent)"
                  : "color-mix(in srgb, var(--color-ft-primary) 10%, transparent)",
              }}
            >
              {t(`type.${debt.type}`)}
            </span>
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
                    className="absolute right-0 top-6 z-20 rounded-lg border shadow-lg py-1 min-w-[120px]"
                    style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)" }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                      style={{ color: "var(--color-ft-text-2)" }}
                    >
                      <Pencil className="h-3 w-3" /> {tc("edit")}
                    </button>
                    <button
                      onClick={async () => { setMenuOpen(false); await archiveMutation({ id: debt._id }); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                      style={{ color: "var(--color-ft-text-3)" }}
                    >
                      <Archive className="h-3 w-3" /> {t("archive")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Balance */}
        <div>
          <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("balance")}</p>
          <p className="text-xl font-bold ft-num mt-0.5" style={{ color: "var(--color-ft-bad)" }}>
            {formatMoney(debt.balanceCents, debt.currencyCode)}
          </p>
        </div>

        {/* Progress bar — installment only */}
        {hasProgress && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px]" style={{ color: "var(--color-ft-text-3)" }}>
                {t("progress")} — {debt.paidInstallments ?? 0}/{debt.totalTermMonths} {t("paidLabel")}
              </span>
              <span className="text-[10px] font-mono" style={{ color: "var(--color-ft-text-3)" }}>
                {remaining} {t("remainingInstallments")}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-ft-surface-2)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${paidPct}%`,
                  backgroundColor: paidPct >= 100 ? "var(--color-ft-good)" : "var(--color-ft-primary)",
                }}
              />
            </div>
          </div>
        )}

        {/* APR + Monthly + extra badges */}
        <div className="grid grid-cols-2 gap-4 pt-1 border-t" style={{ borderColor: "var(--color-ft-border)" }}>
          <div>
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("apr")}</p>
            <p className="text-sm font-mono font-semibold mt-0.5" style={{ color: "var(--color-ft-warn)" }}>
              {aprDisplay}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("monthlyPayment")}</p>
            <p className="text-sm font-mono font-semibold mt-0.5" style={{ color: "var(--color-ft-text-2)" }}>
              {formatMoney(debt.monthlyPaymentCents, debt.currencyCode)}
            </p>
          </div>
        </div>

        {/* Due day + Periodicity */}
        {(debt.paymentDueDate != null || periodicityKey) && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {debt.paymentDueDate != null && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full border"
                style={{ color: "var(--color-ft-text-3)", borderColor: "var(--color-ft-border)" }}
              >
                {t("paymentDueDate")}: {debt.paymentDueDate}
              </span>
            )}
            {periodicityKey && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full border"
                style={{ color: "var(--color-ft-text-3)", borderColor: "var(--color-ft-border)" }}
              >
                {t(periodicityKey)}
              </span>
            )}
          </div>
        )}

        {/* Amortization toggle — installment only */}
        {debt.type === "installment" && (
          <button
            onClick={() => setShowAmortization((s) => !s)}
            className="flex items-center gap-1.5 text-[11px] w-fit"
            style={{ color: "var(--color-ft-primary)" }}
          >
            {showAmortization ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {t("amortization")}
          </button>
        )}

        {showAmortization && (
          <AmortizationTable
            balanceCents={debt.balanceCents}
            interestRateBps={debt.interestRateBps}
            monthlyPaymentCents={debt.monthlyPaymentCents}
            currencyCode={debt.currencyCode}
            paidInstallments={debt.paidInstallments}
            totalTermMonths={debt.totalTermMonths}
          />
        )}
      </div>

      <DebtFormDialog open={editOpen} onOpenChange={setEditOpen} debt={debt} />
    </>
  );
}
