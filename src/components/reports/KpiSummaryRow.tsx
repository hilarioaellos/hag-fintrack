"use client";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/money";

interface KpiSummaryRowProps {
  data: { income: number; expenses: number }[] | undefined;
  currencyCode: string;
}

interface KpiCardProps {
  label: string;
  value: string;
  color?: string;
  loading?: boolean;
}

function KpiCard({ label, value, color, loading }: KpiCardProps) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
    >
      <span className="text-xs font-medium" style={{ color: "var(--color-ft-text-3)" }}>
        {label}
      </span>
      {loading ? (
        <div
          className="animate-pulse rounded h-7 w-24 mt-1"
          style={{ backgroundColor: "var(--color-ft-surface-2)" }}
        />
      ) : (
        <span className="text-xl font-bold ft-num" style={{ color: color ?? "var(--color-ft-text)" }}>
          {value}
        </span>
      )}
    </div>
  );
}

export function KpiSummaryRow({ data, currencyCode }: KpiSummaryRowProps) {
  const t = useTranslations("reports");
  const isLoading = data === undefined;

  const totalIncome = isLoading ? 0 : data.reduce((s, d) => s + d.income, 0);
  const totalExpenses = isLoading ? 0 : data.reduce((s, d) => s + d.expenses, 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const isPositive = netSavings >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label={t("kpiIncome")}
        value={formatMoney(totalIncome, currencyCode)}
        color="#4ade80"
        loading={isLoading}
      />
      <KpiCard
        label={t("kpiExpenses")}
        value={formatMoney(totalExpenses, currencyCode)}
        color="#f87171"
        loading={isLoading}
      />
      <KpiCard
        label={t("kpiNetSavings")}
        value={`${isPositive ? "" : "-"}${formatMoney(Math.abs(netSavings), currencyCode)}`}
        color={isPositive ? "#4ade80" : "#f87171"}
        loading={isLoading}
      />
      <KpiCard
        label={t("kpiSavingsRate")}
        value={`${isPositive ? "" : "-"}${Math.abs(savingsRate)}%`}
        color={isPositive ? "#4ade80" : "#f87171"}
        loading={isLoading}
      />
    </div>
  );
}
