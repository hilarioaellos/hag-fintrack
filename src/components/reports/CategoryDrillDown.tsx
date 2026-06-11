"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations, useLocale } from "next-intl";
import { X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { Doc } from "@convex-api/dataModel";

interface CategoryDrillDownProps {
  categoryId: string;
  label: string;
  color: string;
  totalCents: number;
  year: number;
  month: number;
  currencyCode: string;
  txType: "expense" | "income";
  onClose: () => void;
}

// Rendered only when a category is selected — all useQuery calls are unconditional here
export function CategoryDrillDown({
  categoryId, label, color, totalCents, year, month, currencyCode, txType, onClose,
}: CategoryDrillDownProps) {
  const t = useTranslations("reports");
  const locale = useLocale();

  // Use UTC boundaries to match the server-side expensesByCategory query (Convex runs in UTC)
  const startMs = Date.UTC(year, month - 1, 1);
  const endMs = Date.UTC(year, month, 1) - 1;

  const monthTxs = useQuery(api.fintrack.transactions.list, { startDate: startMs, endDate: endMs });
  const accounts = useQuery(api.fintrack.accounts.list);

  const drillTxs = (monthTxs ?? []).filter((tx: Doc<"fintrack_transactions">) => {
    if (categoryId === "__none__") {
      return !tx.categoryId && tx.type === txType && tx.currencyCode === currencyCode;
    }
    return tx.categoryId === categoryId && tx.type === txType && tx.currencyCode === currencyCode;
  });

  const amountColor = txType === "expense" ? "var(--color-ft-bad)" : "var(--color-ft-good)";

  return (
    <div
      className="rounded-xl border mt-2"
      style={{ borderColor: "var(--color-ft-border)", backgroundColor: "var(--color-ft-surface-2)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--color-ft-border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold" style={{ color: "var(--color-ft-text)" }}>
            {label}
          </span>
          <span className="text-sm font-mono" style={{ color: amountColor }}>
            {formatMoney(totalCents, currencyCode)}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--color-ft-text-3)" }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {monthTxs === undefined ? (
        <div className="p-4 animate-pulse h-16 rounded-b-xl" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
      ) : drillTxs.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <div className="max-h-52 overflow-y-auto">
          {drillTxs.map((tx: Doc<"fintrack_transactions">) => {
            const account = accounts?.find((a: Doc<"fintrack_accounts">) => a._id === tx.accountId);
            const dateStr = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" })
              .format(new Date(tx.date));
            return (
              <div
                key={tx._id}
                className="flex items-center justify-between px-4 py-2.5 border-b last:border-0"
                style={{ borderColor: "var(--color-ft-border)" }}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate" style={{ color: "var(--color-ft-text)" }}>
                    {tx.notes || account?.name || "—"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
                    {dateStr} · {account?.name ?? ""}
                  </span>
                </div>
                <span className="text-xs font-mono ml-4 shrink-0" style={{ color: amountColor }}>
                  {formatMoney(Math.abs(tx.amountCents), currencyCode)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
