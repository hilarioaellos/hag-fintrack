"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState, Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { CurrencySelector } from "@/components/ui/CurrencySelector";
import { KpiSummaryRow } from "./KpiSummaryRow";

// Error boundary — shows clean fallback text, hides raw technical error from users
class ChartErrorBoundary extends Component<
  { children: ReactNode; fallback: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ChartErrorBoundary]", error);
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <p className="text-xs text-center py-8" style={{ color: "var(--color-ft-text-3)" }}>
          {this.props.fallback}
        </p>
      );
    }
    return this.props.children;
  }
}

// Silent boundary for Net Worth — hides section completely if query not deployed
// key={effectiveCurrency} on the wrapper resets hasError when currency changes
class SilentBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[SilentBoundary/NetWorth]", error);
    }
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

const IncomeExpensesChart = dynamic(
  () => import("./IncomeExpensesChart").then((m) => ({ default: m.IncomeExpensesChart })),
  { ssr: false }
);
const CategoryPieChart = dynamic(
  () => import("./CategoryPieChart").then((m) => ({ default: m.CategoryPieChart })),
  { ssr: false }
);
const CategoryBarChart = dynamic(
  () => import("./CategoryBarChart").then((m) => ({ default: m.CategoryBarChart })),
  { ssr: false }
);
const CashFlowChart = dynamic(
  () => import("./CashFlowChart").then((m) => ({ default: m.CashFlowChart })),
  { ssr: false }
);
const NetWorthCard = dynamic(
  () => import("./NetWorthCard").then((m) => ({ default: m.NetWorthCard })),
  { ssr: false }
);

function ReportCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
    >
      <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-ft-text)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

const PERIODS = [1, 3, 6, 12] as const;
type Period = (typeof PERIODS)[number];

export function ReportShell() {
  const t = useTranslations("reports");
  const currencies = useQuery(api.fintrack.accounts.getDistinctCurrencies);
  const userSettings = useQuery(api.fintrack.user_settings.get);
  const [selected, setSelected] = useState<string | undefined>();
  const [months, setMonths] = useState<Period>(6);

  // Defensive resolution: local selection → defaultCurrency if active → first active → "USD"
  const effectiveCurrency = (() => {
    if (!currencies || currencies.length === 0) return userSettings?.defaultCurrency ?? "USD";
    if (selected && currencies.includes(selected)) return selected;
    const def = userSettings?.defaultCurrency ?? "USD";
    return currencies.includes(def) ? def : currencies[0];
  })();

  // Single query — passed to KpiSummaryRow and IncomeExpensesChart
  const incomeData = useQuery(api.fintrack.reports.incomeVsExpenses, {
    months,
    currencyCode: effectiveCurrency,
  });

  const periodKey = (m: Period) =>
    `period${m}m` as "period1m" | "period3m" | "period6m" | "period12m";

  return (
    <div className="space-y-4">
      {/* Header: period tabs + currency selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
              {t(periodKey(m))}
            </button>
          ))}
        </div>
        <CurrencySelector value={effectiveCurrency} currencies={currencies} onChange={setSelected} />
      </div>

      {/* KPI summary cards */}
      <KpiSummaryRow data={incomeData} currencyCode={effectiveCurrency} />

      {/* Main charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard title={t("incomeVsExpenses")}>
          <ChartErrorBoundary fallback={t("chartError")}>
            <IncomeExpensesChart data={incomeData} currencyCode={effectiveCurrency} />
          </ChartErrorBoundary>
        </ReportCard>

        <ReportCard title={t("categoryBreakdown")}>
          <ChartErrorBoundary fallback={t("chartError")}>
            <CategoryBarChart currencyCode={effectiveCurrency} />
          </ChartErrorBoundary>
        </ReportCard>

        <ReportCard title={t("cashFlow")}>
          <ChartErrorBoundary fallback={t("chartError")}>
            <CashFlowChart currencyCode={effectiveCurrency} />
          </ChartErrorBoundary>
        </ReportCard>

        <ReportCard title={t("byCategory")}>
          <ChartErrorBoundary fallback={t("chartError")}>
            <CategoryPieChart currencyCode={effectiveCurrency} />
          </ChartErrorBoundary>
        </ReportCard>
      </div>

      {/* Net Worth — silently hidden if backend not deployed; key resets boundary on currency change */}
      <SilentBoundary key={effectiveCurrency}>
        <ReportCard title={t("netWorthOverTime")}>
          <NetWorthCard currencyCode={effectiveCurrency} />
        </ReportCard>
      </SilentBoundary>
    </div>
  );
}
