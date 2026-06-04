import { getTranslations } from "next-intl/server";
import { BudgetList } from "@/components/budget/BudgetList";

export default async function BudgetPage() {
  const t = await getTranslations("budget");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-ft-text)" }}>
          {t("title")}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-ft-text-3)" }}>
          {t("subtitle")}
        </p>
      </div>
      <BudgetList />
    </div>
  );
}
