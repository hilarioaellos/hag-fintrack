"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState, Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { CurrencySelector } from "@/components/ui/CurrencySelector";

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

const IncomeExpensesChart = dynamic(
  () => import("./IncomeExpensesChart").then((m) => ({ default: m.IncomeExpensesChart })),
  { ssr: false }
);
const CategoryPieChart = dynamic(
  () => import("./CategoryPieChart").then((m) => ({ default: m.CategoryPieChart })),
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

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
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

export function ReportShell() {
  const t = useTranslations("reports");
  const currencies = useQuery(api.fintrack.accounts.getDistinctCurrencies);
  const userSettings = useQuery(api.fintrack.user_settings.get);
  const [selected, setSelected] = useState<string | undefined>();

  // Defensive resolution: local selection → defaultCurrency if active → first active → "USD"
  const effectiveCurrency = (() => {
    if (!currencies || currencies.length === 0) return userSettings?.defaultCurrency ?? "USD";
    if (selected && currencies.includes(selected)) return selected;
    const def = userSettings?.defaultCurrency ?? "USD";
    return currencies.includes(def) ? def : currencies[0];
  })();

  return (
    <div className="space-y-4">
      {/* Currency selector — only visible when user has multiple currencies */}
      <div className="flex justify-end">
        <CurrencySelector value={effectiveCurrency} currencies={currencies} onChange={setSelected} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard title={t("incomeVsExpenses")}>
          <ChartErrorBoundary fallback={t("chartError")}>
            <IncomeExpensesChart currencyCode={effectiveCurrency} />
          </ChartErrorBoundary>
        </ReportCard>

        <ReportCard title={t("byCategory")}>
          <ChartErrorBoundary fallback={t("chartError")}>
            <CategoryPieChart currencyCode={effectiveCurrency} />
          </ChartErrorBoundary>
        </ReportCard>

        <ReportCard title={t("cashFlow")}>
          <ChartErrorBoundary fallback={t("chartError")}>
            <CashFlowChart currencyCode={effectiveCurrency} />
          </ChartErrorBoundary>
        </ReportCard>

        <ReportCard title={t("netWorthOverTime")}>
          <ChartErrorBoundary fallback={t("chartError")}>
            <NetWorthCard currencyCode={effectiveCurrency} />
          </ChartErrorBoundary>
        </ReportCard>
      </div>
    </div>
  );
}
