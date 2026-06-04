"use client";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReportCard title={t("incomeVsExpenses")}>
        <IncomeExpensesChart />
      </ReportCard>

      <ReportCard title={t("byCategory")}>
        <CategoryPieChart />
      </ReportCard>

      <ReportCard title={t("cashFlow")}>
        <CashFlowChart />
      </ReportCard>

      <ReportCard title={t("netWorthOverTime")}>
        <NetWorthCard />
      </ReportCard>
    </div>
  );
}
