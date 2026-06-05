"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Plus, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthNav } from "./MonthNav";
import { BudgetRow } from "./BudgetRow";
import { BudgetFormDialog } from "./BudgetFormDialog";
import { HistoryEstimateDialog } from "./HistoryEstimateDialog";
import type { Doc } from "@convex-api/dataModel";

type Budget = Doc<"fintrack_budgets"> & {
  category: Doc<"fintrack_categories"> | null;
  actualCents: number;
};

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function BudgetList() {
  const t = useTranslations("budget");
  const tc = useTranslations("common");

  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const [addOpen, setAddOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [copying, setCopying] = useState(false);

  const budgets = useQuery(api.fintrack.budgets.listWithActuals, { year, month });
  const copyMutation = useMutation(api.fintrack.budgets.copyFromPreviousMonth);

  const budgetedCategoryIds: Set<string> = new Set(
    (budgets ?? []).map((b: Budget) => b.categoryId as string)
  );

  const totalPlanned = (budgets ?? []).reduce((s: number, b: Budget) => s + b.amountPlannedCents, 0);
  const totalActual = (budgets ?? []).reduce((s: number, b: Budget) => s + b.actualCents, 0);
  const totalBalance = totalPlanned - totalActual;

  const handleCopy = async () => {
    setCopying(true);
    try { await copyMutation({ year, month }); }
    finally { setCopying(false); }
  };

  if (budgets === undefined) {
    return <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEstimateOpen(true)}
            style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {t("estimateFromHistory")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={copying}
            style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            {t("copyPreviousMonth")}
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("addBudget")}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      {budgets.length > 0 && (
        <div
          className="flex flex-wrap gap-6 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: "var(--color-ft-surface)" }}
        >
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--color-ft-text-3)" }}>{t("totalPlanned")}</p>
            <p className="font-mono font-semibold" style={{ color: "var(--color-ft-text)" }}>
              {formatMoney(totalPlanned)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--color-ft-text-3)" }}>{t("actual")}</p>
            <p className="font-mono font-semibold" style={{ color: "var(--color-ft-bad)" }}>
              {formatMoney(totalActual)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--color-ft-text-3)" }}>{t("balance")}</p>
            <p
              className="font-mono font-semibold"
              style={{ color: totalBalance >= 0 ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}
            >
              {totalBalance >= 0 ? "+" : ""}{formatMoney(totalBalance)}
            </p>
          </div>
        </div>
      )}

      {/* Budget list */}
      {budgets.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-10 flex flex-col items-center gap-2"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>
            {t("nobudgets")}
          </p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--color-ft-text-3)" }}>
            {t("nobudgetsHint")}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
        >
          {budgets.map((b: Budget) => (
            <BudgetRow
              key={b._id}
              budget={b}
              year={year}
              month={month}
              budgetedCategoryIds={budgetedCategoryIds}
            />
          ))}
        </div>
      )}

      <BudgetFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        year={year}
        month={month}
        budgetedCategoryIds={budgetedCategoryIds}
      />
      <HistoryEstimateDialog
        open={estimateOpen}
        onOpenChange={setEstimateOpen}
        year={year}
        month={month}
        budgetedCategoryIds={budgetedCategoryIds}
      />
    </div>
  );
}
