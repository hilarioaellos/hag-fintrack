"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { MonthNav } from "@/components/budget/MonthNav";
import { CategoryDrillDown } from "./CategoryDrillDown";

type CatRow = { categoryId: string; name: string; icon: string; color: string; totalCents: number };

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function catLabel(d: CatRow, uncategorized: string) {
  return d.categoryId === "__none__" ? uncategorized : `${d.icon} ${d.name}`;
}

export function CategoryBarChart({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations("reports");
  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [selectedCat, setSelectedCat] = useState<CatRow | null>(null);

  const raw = useQuery(api.fintrack.reports.expensesByCategory, { year, month, currencyCode, txType });

  const data: CatRow[] = raw
    ? [...(raw as CatRow[])].sort((a, b) => b.totalCents - a.totalCents)
    : [];

  const maxCents = data[0]?.totalCents ?? 1;
  const total = data.reduce((s, d) => s + d.totalCents, 0);

  return (
    <div className="space-y-3">
      {/* Expense / Income toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => { setTxType("expense"); setSelectedCat(null); }}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: txType === "expense" ? "var(--color-ft-bad)" : "var(--color-ft-surface-2)",
            color: txType === "expense" ? "#fff" : "var(--color-ft-text-3)",
          }}
        >
          {t("expenses")}
        </button>
        <button
          onClick={() => { setTxType("income"); setSelectedCat(null); }}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: txType === "income" ? "var(--color-ft-good)" : "var(--color-ft-surface-2)",
            color: txType === "income" ? "#000" : "var(--color-ft-text-3)",
          }}
        >
          {t("income")}
        </button>
      </div>

      <MonthNav
        year={year}
        month={month}
        onChange={(y, m) => { setPeriod({ year: y, month: m }); setSelectedCat(null); }}
      />

      {raw === undefined ? (
        <div className="animate-pulse rounded-lg h-[200px]" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
      ) : data.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {data.map((cat) => {
              const isSelected = selectedCat?.categoryId === cat.categoryId;
              const pct = total > 0 ? ((cat.totalCents / total) * 100).toFixed(0) : "0";
              const barWidth = `${(cat.totalCents / maxCents) * 100}%`;

              return (
                <div
                  key={cat.categoryId}
                  className="rounded-lg px-3 py-2 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: isSelected ? "var(--color-ft-surface-2)" : "transparent",
                    outline: isSelected ? `1px solid ${cat.color ?? "#94a3b8"}` : "none",
                  }}
                  onClick={() => setSelectedCat(isSelected ? null : cat)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color ?? "#94a3b8" }}
                      />
                      <span className="text-xs truncate" style={{ color: "var(--color-ft-text-2)" }}>
                        {catLabel(cat, t("uncategorized"))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{pct}%</span>
                      <span className="text-xs font-mono font-medium" style={{ color: "var(--color-ft-text)" }}>
                        {formatMoney(cat.totalCents, currencyCode)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--color-ft-surface-2)" }}>
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: barWidth, backgroundColor: cat.color ?? "#94a3b8" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drill-down — separate component avoids conditional useQuery ("skip" bug) */}
          {selectedCat && (
            <CategoryDrillDown
              categoryId={selectedCat.categoryId}
              label={catLabel(selectedCat, t("uncategorized"))}
              color={selectedCat.color ?? "#94a3b8"}
              totalCents={selectedCat.totalCents}
              year={year}
              month={month}
              currencyCode={currencyCode}
              txType={txType}
              onClose={() => setSelectedCat(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
