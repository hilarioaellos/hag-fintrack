import { getTranslations } from "next-intl/server";
import { WidgetGrid } from "@/components/dashboard/WidgetGrid";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" style={{ color: "var(--color-ft-text)" }}>
        {t("title")}
      </h1>
      <WidgetGrid />
    </div>
  );
}
