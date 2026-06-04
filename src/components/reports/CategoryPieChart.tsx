"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { MonthNav } from "@/components/budget/MonthNav";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function CategoryPieChart() {
  const t = useTranslations("reports");
  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const data = useQuery(api.fintrack.reports.expensesByCategory, { year, month });

  type CatRow = { categoryId: string; name: string; icon: string; color: string; totalCents: number };
  const total = (data ?? []).reduce((s: number, d: CatRow) => s + d.totalCents, 0);

  return (
    <div className="space-y-3">
      <MonthNav year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
      {!data || data.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
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
              >
                {(data as CatRow[]).map((entry: CatRow, i: number) => (
                  <Cell key={i} fill={entry.color ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`$${(value / 100).toFixed(2)}`]}
                contentStyle={{
                  backgroundColor: "var(--color-ft-surface-2)",
                  border: "1px solid var(--color-ft-border)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex-1 space-y-1.5 min-w-0 pt-2">
            {(data as CatRow[]).slice(0, 7).map((d: CatRow) => (
              <div key={d.categoryId} className="flex items-center justify-between gap-2">
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
