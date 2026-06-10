"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { MonthNav } from "@/components/budget/MonthNav";

type CatRow = { categoryId: string; name: string; icon: string; color: string; totalCents: number };

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function CategoryBarChart({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations("reports");
  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const [txType, setTxType] = useState<"expense" | "income">("expense");

  const raw = useQuery(api.fintrack.reports.expensesByCategory, { year, month, currencyCode, txType });

  // Sort descending by totalCents (backend already returns sorted, but enforce client-side too)
  const data: CatRow[] = raw
    ? [...(raw as CatRow[])].sort((a, b) => b.totalCents - a.totalCents)
    : [];

  function catLabel(d: CatRow) {
    return d.categoryId === "__none__" ? t("uncategorized") : `${d.icon} ${d.name}`;
  }

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
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 60, left: 8, bottom: 0 }}
            barCategoryGap="25%"
          >
            <XAxis
              type="number"
              tickFormatter={(v: number) => formatMoneyCompact(v, currencyCode)}
              tick={{ fontSize: 10, fill: "var(--color-ft-text-3)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey={(d: CatRow) => catLabel(d)}
              tick={{ fontSize: 11, fill: "var(--color-ft-text-2)" }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip
              formatter={(value: number, _name: string, props: { payload?: CatRow }) => [
                formatMoney(value, currencyCode),
                props.payload ? catLabel(props.payload) : "",
              ]}
              contentStyle={{
                backgroundColor: "var(--color-ft-surface-2)",
                border: "1px solid var(--color-ft-border)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              labelStyle={{ display: "none" }}
              itemStyle={{ color: "var(--color-ft-text-2)" }}
            />
            <Bar dataKey="totalCents" radius={[0, 3, 3, 0]} label={{
              position: "right",
              formatter: (v: number) => formatMoneyCompact(v, currencyCode),
              fontSize: 10,
              fill: "var(--color-ft-text-3)",
            }}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color ?? "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
