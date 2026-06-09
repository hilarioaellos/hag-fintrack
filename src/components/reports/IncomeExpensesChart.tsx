"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

const PERIODS = [3, 6, 12] as const;
type Period = (typeof PERIODS)[number];

export function IncomeExpensesChart({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const [months, setMonths] = useState<Period>(6);
  const data = useQuery(api.fintrack.reports.incomeVsExpenses, { months, currencyCode });

  type Row = { year: number; month: number; income: number; expenses: number };
  const formatted = (data ?? []).map((d: Row) => ({
    label: new Intl.DateTimeFormat(locale, { month: "short" })
      .format(new Date(d.year, d.month - 1, 1)),
    income: d.income,
    expenses: d.expenses,
  }));

  const totalIncome = formatted.reduce((s: number, d: { income: number; expenses: number; label: string }) => s + d.income, 0);
  const totalExpenses = formatted.reduce((s: number, d: { income: number; expenses: number; label: string }) => s + d.expenses, 0);
  const netSavings = totalIncome - totalExpenses;
  const savingPct = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const isPositive = netSavings >= 0;

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex gap-1">
        {PERIODS.map((m) => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: months === m ? "var(--color-ft-primary)" : "var(--color-ft-surface-2)",
              color: months === m ? "#000" : "var(--color-ft-text-3)",
            }}
          >
            {t(`period${m}m` as "period3m" | "period6m" | "period12m")}
          </button>
        ))}
      </div>

      {data === undefined ? (
        <div className="animate-pulse rounded-lg h-[220px]" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
      ) : formatted.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formatted} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ft-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-ft-text-3)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatMoneyCompact(v, currencyCode)}
                tick={{ fontSize: 11, fill: "var(--color-ft-text-3)" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatMoney(value, currencyCode),
                  name === "income" ? t("income") : t("expenses"),
                ]}
                contentStyle={{
                  backgroundColor: "var(--color-ft-surface-2)",
                  border: "1px solid var(--color-ft-border)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--color-ft-text)", marginBottom: 4 }}
                itemStyle={{ color: "var(--color-ft-text-2)" }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: "var(--color-ft-text-3)" }}>
                    {value === "income" ? t("income") : t("expenses")}
                  </span>
                )}
              />
              <Bar dataKey="income" fill="#4ade80" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Saving rate summary */}
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2"
            style={{ backgroundColor: "var(--color-ft-surface-2)" }}
          >
            <span className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
              {t("netSavings")}
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-mono font-semibold"
                style={{ color: isPositive ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}
              >
                {isPositive ? "+" : "-"}{formatMoney(Math.abs(netSavings), currencyCode)}
              </span>
              {totalIncome > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: isPositive ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
                    color: isPositive ? "var(--color-ft-good)" : "var(--color-ft-bad)",
                  }}
                >
                  {t("savingRate", { pct: Math.abs(savingPct) })}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
