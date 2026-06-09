"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations, useLocale } from "next-intl";
import { useState, useMemo } from "react";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { MonthNav } from "@/components/budget/MonthNav";

type Granularity = "daily" | "weekly" | "monthly";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function CashFlowChart({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const [granularity, setGranularity] = useState<Granularity>("daily");

  type DayRow = { day: number; incomeCents: number; expenseCents: number };
  type MonthRow = { year: number; month: number; income: number; expenses: number };

  const dailyData = useQuery(
    granularity !== "monthly" ? api.fintrack.reports.cashFlowByDay : "skip",
    granularity !== "monthly" ? { year, month, currencyCode } : "skip"
  );

  const monthlyRaw = useQuery(
    granularity === "monthly" ? api.fintrack.reports.incomeVsExpenses : "skip",
    granularity === "monthly" ? { months: 12, currencyCode } : "skip"
  );

  const weeklyData = useMemo(() => {
    if (!dailyData) return null;
    const weeks = [
      { label: t("week", { n: 1 }), incomeCents: 0, expenseCents: 0 },
      { label: t("week", { n: 2 }), incomeCents: 0, expenseCents: 0 },
      { label: t("week", { n: 3 }), incomeCents: 0, expenseCents: 0 },
      { label: t("week", { n: 4 }), incomeCents: 0, expenseCents: 0 },
    ];
    for (const d of dailyData as DayRow[]) {
      const wi = Math.min(Math.floor((d.day - 1) / 7), 3);
      weeks[wi].incomeCents += d.incomeCents;
      weeks[wi].expenseCents += d.expenseCents;
    }
    return weeks;
  }, [dailyData, t]);

  const monthlyData = useMemo(() => {
    if (!monthlyRaw) return null;
    return (monthlyRaw as MonthRow[]).map((d) => ({
      label: new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(
        new Date(d.year, d.month - 1, 1)
      ),
      incomeCents: d.income,
      expenseCents: d.expenses,
    }));
  }, [monthlyRaw, locale]);

  const chartData =
    granularity === "daily"
      ? (dailyData as DayRow[] | undefined)?.map((d) => ({
          label: String(d.day),
          incomeCents: d.incomeCents,
          expenseCents: d.expenseCents,
        }))
      : granularity === "weekly"
      ? weeklyData ?? undefined
      : monthlyData ?? undefined;

  const isLoading = granularity === "monthly" ? monthlyRaw === undefined : dailyData === undefined;
  const hasData = chartData?.some((d) => d.incomeCents > 0 || d.expenseCents > 0) ?? false;

  const GRANS: Array<{ key: Granularity; label: string }> = [
    { key: "daily", label: t("granDaily") },
    { key: "weekly", label: t("granWeekly") },
    { key: "monthly", label: t("granMonthly") },
  ];

  return (
    <div className="space-y-3">
      {/* Granularity tabs */}
      <div className="flex gap-1">
        {GRANS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setGranularity(key)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: granularity === key ? "var(--color-ft-primary)" : "var(--color-ft-surface-2)",
              color: granularity === key ? "#000" : "var(--color-ft-text-3)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {granularity !== "monthly" && (
        <MonthNav year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
      )}

      {isLoading ? (
        <div className="animate-pulse rounded-lg h-[200px]" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
      ) : !hasData ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ft-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--color-ft-text-3)" }}
              axisLine={false}
              tickLine={false}
              interval={granularity === "daily" ? 4 : 0}
            />
            <YAxis
              tickFormatter={(v: number) => formatMoneyCompact(v, currencyCode)}
              tick={{ fontSize: 10, fill: "var(--color-ft-text-3)" }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatMoney(value, currencyCode),
                name === "incomeCents" ? t("income") : t("expenses"),
              ]}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                backgroundColor: "var(--color-ft-surface-2)",
                border: "1px solid var(--color-ft-border)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-ft-text)", marginBottom: 4 }}
              itemStyle={{ color: "var(--color-ft-text-2)" }}
            />
            <Bar dataKey="incomeCents" fill="#4ade80" radius={[2, 2, 0, 0]} />
            <Bar dataKey="expenseCents" fill="#f87171" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
