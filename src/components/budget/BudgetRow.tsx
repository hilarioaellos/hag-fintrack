"use client";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Doc } from "@convex-api/dataModel";
import { BudgetFormDialog } from "./BudgetFormDialog";

type Budget = Doc<"fintrack_budgets"> & {
  category: Doc<"fintrack_categories"> | null;
  actualCents: number;
};

function progressColor(ratio: number): string {
  if (ratio >= 1) return "var(--color-ft-bad)";
  if (ratio >= 0.8) return "var(--color-ft-warn)";
  return "var(--color-ft-good)";
}

interface Props {
  budget: Budget;
  year: number;
  month: number;
  budgetedCategoryIds: Set<string>;
}

export function BudgetRow({ budget, year, month, budgetedCategoryIds }: Props) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const remove = useMutation(api.fintrack.budgets.remove);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { actualCents, amountPlannedCents, category } = budget;
  const ratio = amountPlannedCents > 0 ? actualCents / amountPlannedCents : 0;
  const pct = Math.min(ratio * 100, 100);
  const remainingCents = amountPlannedCents - actualCents;
  const isOver = remainingCents < 0;
  const color = progressColor(ratio);

  return (
    <>
      <div
        className="px-4 py-3 flex flex-col gap-2 group border-b last:border-0"
        style={{ borderColor: "var(--color-ft-border)" }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{category?.icon ?? "📦"}</span>
            <span className="text-sm font-medium truncate" style={{ color: "var(--color-ft-text)" }}>
              {category?.name ?? "Unknown"}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-sm font-mono" style={{ color: "var(--color-ft-text)" }}>
                {formatMoney(actualCents)}{" "}
                <span style={{ color: "var(--color-ft-text-3)" }}>
                  {t("of")} {formatMoney(amountPlannedCents)}
                </span>
              </p>
              <p
                className="text-xs font-medium"
                style={{ color: isOver ? "var(--color-ft-bad)" : "var(--color-ft-text-3)" }}
              >
                {isOver
                  ? `${formatMoney(-remainingCents)} ${t("over")}`
                  : `${formatMoney(remainingCents)} ${t("remaining")}`}
              </p>
            </div>

            {/* Menu */}
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
                      onClick={async () => { setMenuOpen(false); await remove({ id: budget._id }); }}
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
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-ft-border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <p className="text-[10px] font-mono" style={{ color }}>
            {(ratio * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <BudgetFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        year={year}
        month={month}
        budget={budget}
        budgetedCategoryIds={budgetedCategoryIds}
      />
    </>
  );
}
