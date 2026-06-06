"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";

export function NetWorthCard({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations("reports");
  const data = useQuery(api.fintrack.reports.netWorthSnapshot, { currencyCode });

  if (!data) {
    return (
      <div className="animate-pulse rounded-lg h-16" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
    );
  }

  const isPositive = data.totalCents >= 0;

  return (
    <div className="flex flex-col gap-1 py-2">
      <p
        className="text-3xl font-bold ft-num"
        style={{ color: isPositive ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}
      >
        {isPositive ? "" : "-"}{formatMoney(Math.abs(data.totalCents), currencyCode)}
      </p>
      <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
        {data.accountCount} {t("accounts")}
      </p>
    </div>
  );
}
