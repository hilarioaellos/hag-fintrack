"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations, useLocale } from "next-intl";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export function IncomeExpensesChart({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const data = useQuery(api.fintrack.reports.incomeVsExpenses, { months: 6, currencyCode });

  type Row = { year: number; month: number; income: number; expenses: number };
  const formatted = (data ?? []).map((d: Row) => ({
    label: new Intl.DateTimeFormat(locale, { month: "short" })
      .format(new Date(d.year, d.month - 1, 1)),
    income: d.income,
    expenses: d.expenses,
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
        {t("last6Months")}
      </p>
      {data === undefined ? (
        <div className="animate-pulse rounded-lg h-[220px]" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
      ) : formatted.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
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
      )}
    </div>
  );
}
