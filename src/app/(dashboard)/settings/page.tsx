import { getTranslations } from "next-intl/server";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
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
      <SettingsForm />
    </div>
  );
}
