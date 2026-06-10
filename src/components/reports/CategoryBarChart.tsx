"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { formatMoney } from "@/lib/money";
import { X } from "lucide-react";
import { MonthNav } from "@/components/budget/MonthNav";
import type { Doc } from "@convex-api/dataModel";

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
  const locale = useLocale();
  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [selectedCat, setSelectedCat] = useState<CatRow | null>(null);

  const raw = useQuery(api.fintrack.reports.expensesByCategory, { year, month, currencyCode, txType });

  useEffect(() => { setSelectedCat(null); }, [currencyCode, year, month, txType]);

  const data: CatRow[] = raw
    ? [...(raw as CatRow[])].sort((a, b) => b.totalCents - a.totalCents)
    : [];

  const maxCents = data[0]?.totalCents ?? 1;
  const total = data.reduce((s, d) => s + d.totalCents, 0);

  // Drill-down queries — only when a category is selected
  const startMs = new Date(year, month - 1, 1).getTime();
  const endMs = new Date(year, month, 1).getTime() - 1;

  const monthTxs = useQuery(
    selectedCat ? api.fintrack.transactions.list : "skip",
    selectedCat ? { startDate: startMs, endDate: endMs } : "skip"
  );
  const accounts = useQuery(selectedCat ? api.fintrack.accounts.list : "skip");

  const drillTxs = (monthTxs ?? []).filter((tx: Doc<"fintrack_transactions">) => {
    if (selectedCat?.categoryId === "__none__") {
      return !tx.categoryId && tx.type === txType && tx.currencyCode === currencyCode;
    }
    return tx.categoryId === selectedCat?.categoryId && tx.currencyCode === currencyCode;
  });

  return (
    <div className="space-y-3">
      {/* Expense / Income toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setTxType("expense")}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: txType === "expense" ? "var(--color-ft-bad)" : "var(--color-ft-surface-2)",
            color: txType === "expense" ? "#fff" : "var(--color-ft-text-3)",
          }}
        >
          {t("expenses")}
        </button>
        <button
          onClick={() => setTxType("income")}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: txType === "income" ? "var(--color-ft-good)" : "var(--color-ft-surface-2)",
            color: txType === "income" ? "#000" : "var(--color-ft-text-3)",
          }}
        >
          {t("income")}
        </button>
      </div>

      <MonthNav year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />

      {raw === undefined ? (
        <div className="animate-pulse rounded-lg h-[200px]" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
      ) : data.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <>
          {/* Category rows */}
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
                  {/* Name row */}
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
                  {/* CSS bar */}
                  <div
                    className="h-1.5 rounded-full"
                    style={{ backgroundColor: "var(--color-ft-surface-2)", width: "100%" }}
                  >
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: barWidth, backgroundColor: cat.color ?? "#94a3b8" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drill-down panel */}
          {selectedCat && (
            <div
              className="rounded-xl border mt-2"
              style={{ borderColor: "var(--color-ft-border)", backgroundColor: "var(--color-ft-surface-2)" }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: "var(--color-ft-border)" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: selectedCat.color ?? "#94a3b8" }}
                  />
                  <span className="text-sm font-semibold" style={{ color: "var(--color-ft-text)" }}>
                    {catLabel(selectedCat, t("uncategorized"))}
                  </span>
                  <span className="text-sm font-mono" style={{ color: txType === "expense" ? "var(--color-ft-bad)" : "var(--color-ft-good)" }}>
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
                        <span
                          className="text-xs font-mono ml-4 shrink-0"
                          style={{ color: txType === "expense" ? "var(--color-ft-bad)" : "var(--color-ft-good)" }}
                        >
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
