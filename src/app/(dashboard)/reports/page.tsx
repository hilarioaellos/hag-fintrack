import { getTranslations } from "next-intl/server";

export default async function ReportsPage() {
  const t = await getTranslations("reports");
  return (
    <div>
      <h1 className="text-xl font-semibold" style={{ color: "var(--color-ft-text)" }}>
        {t("title")}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--color-ft-text-2)" }}>
        Bloque 8 — Próximamente
      </p>
    </div>
  );
}
