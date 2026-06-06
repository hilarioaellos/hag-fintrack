"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DebtCard } from "./DebtCard";
import { DebtFormDialog } from "./DebtFormDialog";
import type { Doc } from "@convex-api/dataModel";

type Debt = Doc<"fintrack_debts">;

type Strategy = "avalanche" | "snowball";

export function DebtsList() {
  const t = useTranslations("debts");
  const tc = useTranslations("common");
  const debts = useQuery(api.fintrack.debts.list);
  const [addOpen, setAddOpen] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>("avalanche");

  if (debts === undefined) {
    return <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>;
  }

  const currencies = new Set(debts.map((d: Debt) => d.currencyCode));
  const singleCurrency = currencies.size === 1 ? debts[0].currencyCode : null;
  const totalDebt = singleCurrency
    ? debts.reduce((s: number, d: Debt) => s + d.balanceCents, 0)
    : null;

  const sorted = [...debts].sort((a: Debt, b: Debt) =>
    strategy === "avalanche"
      ? b.interestRateBps - a.interestRateBps
      : a.balanceCents - b.balanceCents
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {totalDebt !== null && (
          <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>
            {t("totalDebt")}:{" "}
            <span className="font-mono font-semibold" style={{ color: "var(--color-ft-bad)" }}>
              {formatMoney(totalDebt, singleCurrency!)}
            </span>
          </p>
        )}
        <Button
          onClick={() => setAddOpen(true)}
          className="ml-auto"
          style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {t("addDebt")}
        </Button>
      </div>

      {debts.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-10 flex flex-col items-center gap-2"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>{t("noDebts")}</p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("noDebtsHint")}</p>
        </div>
      ) : (
        <>
          {/* Debt cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {debts.map((d: Debt) => <DebtCard key={d._id} debt={d} />)}
          </div>

          {/* Payoff strategy */}
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--color-ft-text)" }}>
              {t("payoffOrder")}
            </p>

            {/* Strategy toggle */}
            <div className="flex rounded-lg overflow-hidden border w-fit" style={{ borderColor: "var(--color-ft-border)" }}>
              {(["avalanche", "snowball"] as Strategy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStrategy(s)}
                  className="px-4 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: strategy === s ? "var(--color-ft-primary)" : "var(--color-ft-surface-2)",
                    color: strategy === s ? "#080d18" : "var(--color-ft-text-2)",
                  }}
                >
                  {t(s)}
                </button>
              ))}
            </div>

            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
              {t(`${strategy}Desc`)}
            </p>

            {/* Mixed-currency snowball warning */}
            {strategy === "snowball" && currencies.size > 1 && (
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-ft-warn) 10%, transparent)",
                  color: "var(--color-ft-warn)",
                  border: "1px solid color-mix(in srgb, var(--color-ft-warn) 25%, transparent)",
                }}
              >
                <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{t("snowballMixedCurrencyWarning")}</span>
              </div>
            )}

            {/* Ordered list */}
            <div className="space-y-2">
              {sorted.map((d: Debt, i: number) => (
                <div key={d._id} className="flex items-center gap-3">
                  <span
                    className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: i === 0 ? "var(--color-ft-primary)" : "var(--color-ft-surface-2)",
                      color: i === 0 ? "#080d18" : "var(--color-ft-text-3)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--color-ft-text)" }}>{d.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono" style={{ color: "var(--color-ft-bad)" }}>
                      {formatMoney(d.balanceCents, d.currencyCode)}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--color-ft-text-3)" }}>
                      {(d.interestRateBps / 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <DebtFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
