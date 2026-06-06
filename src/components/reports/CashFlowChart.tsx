"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { MonthNav } from "@/components/budget/MonthNav";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function CashFlowChart({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations("reports");
  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const data = useQuery(api.fintrack.reports.cashFlowByDay, { year, month, currencyCode });

  type DayRow = { day: number; incomeCents: number; expenseCents: number };
  const hasData = data !== undefined && data.some((d: DayRow) => d.incomeCents > 0 || d.expenseCents > 0);

  return (
    <div className="space-y-3">
      <MonthNav year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
      {data === undefined ? (
        <div className="animate-pulse rounded-lg h-[200px]" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
      ) : !hasData ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ft-border)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "var(--color-ft-text-3)" }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
              tick={{ fontSize: 10, fill: "var(--color-ft-text-3)" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `$${(value / 100).toFixed(2)}`,
                name === "incomeCents" ? t("income") : t("expenses"),
              ]}
              labelFormatter={(label) => `Day ${label}`}
              contentStyle={{
                backgroundColor: "var(--color-ft-surface-2)",
                border: "1px solid var(--color-ft-border)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-ft-text)", marginBottom: 4 }}
            />
            <Bar dataKey="incomeCents" fill="#4ade80" radius={[2, 2, 0, 0]} />
            <Bar dataKey="expenseCents" fill="#f87171" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
