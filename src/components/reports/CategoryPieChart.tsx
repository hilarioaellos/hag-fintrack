"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { formatMoney } from "@/lib/money";
import { X } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { MonthNav } from "@/components/budget/MonthNav";
import type { Doc } from "@convex-api/dataModel";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

type CatRow = { categoryId: string; name: string; icon: string; color: string; totalCents: number };

export function CategoryPieChart({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const [selectedCat, setSelectedCat] = useState<CatRow | null>(null);

  const data = useQuery(api.fintrack.reports.expensesByCategory, { year, month, currencyCode });

  useEffect(() => { setSelectedCat(null); }, [currencyCode]);

  const startMs = new Date(year, month - 1, 1).getTime();
  const endMs = new Date(year, month, 1).getTime() - 1;

  const monthTxs = useQuery(
    selectedCat ? api.fintrack.transactions.list : "skip",
    selectedCat ? { startDate: startMs, endDate: endMs } : "skip"
  );
  const accounts = useQuery(selectedCat ? api.fintrack.accounts.list : "skip");

  const drillTxs = (monthTxs ?? []).filter(
    (tx: Doc<"fintrack_transactions">) =>
      tx.categoryId === selectedCat?.categoryId && tx.currencyCode === currencyCode
  );

  const total = (data ?? []).reduce((s: number, d: CatRow) => s + d.totalCents, 0);

  const handlePeriodChange = (y: number, m: number) => {
    setPeriod({ year: y, month: m });
    setSelectedCat(null);
  };

  const toggleCat = (cat: CatRow) =>
    setSelectedCat((prev) => (prev?.categoryId === cat.categoryId ? null : cat));

  return (
    <div className="space-y-3">
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
                        {d.icon} {d.name}
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

          {/* Drill-down panel */}
          {selectedCat && (
            <div
              className="rounded-xl border mt-2"
              style={{ borderColor: "var(--color-ft-border)", backgroundColor: "var(--color-ft-surface-2)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-ft-border)" }}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: selectedCat.color ?? "#94a3b8" }}
                  />
                  <span className="text-sm font-semibold" style={{ color: "var(--color-ft-text)" }}>
                    {selectedCat.icon} {selectedCat.name}
                  </span>
                  <span className="text-sm font-mono" style={{ color: "var(--color-ft-bad)" }}>
                    {formatMoney(selectedCat.totalCents, currencyCode)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCat(null)}
                  className="p-1 rounded-lg"
                  style={{ color: "var(--color-ft-text-3)" }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Transaction list */}
              {monthTxs === undefined ? (
                <div className="p-4 animate-pulse h-16 rounded-b-xl" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
              ) : drillTxs.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "var(--color-ft-text-3)" }}>
                  {t("noData")}
                </p>
              ) : (
                <div className="max-h-52 overflow-y-auto">
                  {drillTxs.map((tx: Doc<"fintrack_transactions">) => {
                    const account = accounts?.find((a: Doc<"fintrack_accounts">) => a._id === tx.accountId);
                    const dateStr = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" })
                      .format(new Date(tx.date));
                    return (
                      <div
                        key={tx._id}
                        className="flex items-center justify-between px-4 py-2.5 border-b last:border-0"
                        style={{ borderColor: "var(--color-ft-border)" }}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium truncate" style={{ color: "var(--color-ft-text)" }}>
                            {tx.notes || account?.name || "—"}
                          </span>
                          <span className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
                            {dateStr} · {account?.name ?? ""}
                          </span>
                        </div>
                        <span className="text-xs font-mono ml-4 shrink-0" style={{ color: "var(--color-ft-bad)" }}>
                          {formatMoney(Math.abs(tx.amountCents), currencyCode)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
