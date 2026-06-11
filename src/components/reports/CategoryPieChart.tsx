"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { formatMoney } from "@/lib/money";
import { localMonthRange } from "@/lib/dates";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { MonthNav } from "@/components/budget/MonthNav";
import { CategoryDrillDown } from "./CategoryDrillDown";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

type CatRow = { categoryId: string; name: string; icon: string; color: string; totalCents: number };

export function CategoryPieChart({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations("reports");
  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const [selectedCat, setSelectedCat] = useState<CatRow | null>(null);
  const [txType, setTxType] = useState<"expense" | "income">("expense");

  const { startMs, endMs } = localMonthRange(year, month);
  const data = useQuery(api.fintrack.reports.expensesByCategory, { year, month, currencyCode, txType, startMs, endMs });

  useEffect(() => { setSelectedCat(null); }, [currencyCode]);

  const total = (data ?? []).reduce((s: number, d: CatRow) => s + d.totalCents, 0);

  const handlePeriodChange = (y: number, m: number) => {
    setPeriod({ year: y, month: m });
    setSelectedCat(null);
  };

  const handleTypeChange = (type: "expense" | "income") => {
    setTxType(type);
    setSelectedCat(null);
  };

  const toggleCat = (cat: CatRow) =>
    setSelectedCat((prev) => (prev?.categoryId === cat.categoryId ? null : cat));

  function catLabel(d: CatRow) {
    return d.categoryId === "__none__" ? t("uncategorized") : `${d.icon} ${d.name}`;
  }

  return (
    <div className="space-y-3">
      {/* Expense / Income toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => handleTypeChange("expense")}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: txType === "expense" ? "var(--color-ft-bad)" : "var(--color-ft-surface-2)",
            color: txType === "expense" ? "#fff" : "var(--color-ft-text-3)",
          }}
        >
          {t("expenses")}
        </button>
        <button
          onClick={() => handleTypeChange("income")}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: txType === "income" ? "var(--color-ft-good)" : "var(--color-ft-surface-2)",
            color: txType === "income" ? "#000" : "var(--color-ft-text-3)",
          }}
        >
          {t("income")}
        </button>
      </div>

      <MonthNav year={year} month={month} onChange={handlePeriodChange} />

      {data === undefined ? (
        <div className="animate-pulse rounded-lg h-[160px]" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
      ) : data.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <>
          <div className="flex items-start gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="totalCents"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={2}
                  style={{ cursor: "pointer" }}
                  onClick={(_, index) => toggleCat((data as CatRow[])[index])}
                >
                  {(data as CatRow[]).map((entry: CatRow, i: number) => (
                    <Cell
                      key={i}
                      fill={entry.color ?? "#94a3b8"}
                      opacity={selectedCat && selectedCat.categoryId !== entry.categoryId ? 0.35 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatMoney(value, currencyCode)]}
                  labelFormatter={(_, payload) => {
                    const d = payload?.[0]?.payload as CatRow | undefined;
                    return d ? catLabel(d) : "";
                  }}
                  contentStyle={{
                    backgroundColor: "var(--color-ft-surface-2)",
                    border: "1px solid var(--color-ft-border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--color-ft-text)", marginBottom: 4 }}
                  itemStyle={{ color: "var(--color-ft-text-2)" }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex-1 space-y-1.5 min-w-0 pt-2">
              {(data as CatRow[]).slice(0, 7).map((d: CatRow) => {
                const isSelected = selectedCat?.categoryId === d.categoryId;
                return (
                  <div
                    key={d.categoryId}
                    className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-0.5 cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isSelected ? "var(--color-ft-surface-2)" : "transparent",
                      opacity: selectedCat && !isSelected ? 0.45 : 1,
                    }}
                    onClick={() => toggleCat(d)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: d.color ?? "#94a3b8" }}
                      />
                      <span className="text-xs truncate" style={{ color: "var(--color-ft-text-2)" }}>
                        {catLabel(d)}
                      </span>
                    </div>
                    <span className="text-xs font-mono shrink-0" style={{ color: "var(--color-ft-text-3)" }}>
                      {total > 0 ? `${((d.totalCents / total) * 100).toFixed(0)}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drill-down — separate component avoids conditional useQuery ("skip" bug) */}
          {selectedCat && (
            <CategoryDrillDown
              categoryId={selectedCat.categoryId}
              label={catLabel(selectedCat)}
              color={selectedCat.color ?? "#94a3b8"}
              totalCents={selectedCat.totalCents}
              startMs={startMs}
              endMs={endMs}
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
