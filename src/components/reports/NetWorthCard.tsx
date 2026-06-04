"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";

export function NetWorthCard() {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const data = useQuery(api.fintrack.reports.netWorthSnapshot);

  if (!data) {
    return (
      <p className="text-sm py-4" style={{ color: "var(--color-ft-text-3)" }}>
        {tc("loading")}
      </p>
    );
  }

  const isPositive = data.totalCents >= 0;

  return (
    <div className="flex flex-col gap-1 py-2">
      <p
        className="text-3xl font-bold ft-num"
        style={{ color: isPositive ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}
      >
        {isPositive ? "" : "-"}{formatMoney(Math.abs(data.totalCents))}
      </p>
      <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
        {data.accountCount} {t("accounts")}
      </p>
    </div>
  );
}
