"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations, useLocale } from "next-intl";
import type { Doc, Id } from "@convex-api/dataModel";

type Rec = Doc<"fintrack_reconciliations">;

const STATUS_COLORS: Record<Rec["status"], string> = {
  completed:   "var(--color-ft-good)",
  discrepancy: "var(--color-ft-bad)",
  pending:     "var(--color-ft-warn)",
};

interface Props {
  accountId: Id<"fintrack_accounts">;
  currency: string;
}

export function ReconciliationHistory({ accountId, currency }: Props) {
  const t = useTranslations("reconciliation");
  const tc = useTranslations("common");
  const locale = useLocale();
  const records = useQuery(api.fintrack.reconciliations.listByAccount, { accountId });

  if (records === undefined) {
    return <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>;
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: "var(--color-ft-text-3)" }}>
        {t("noHistory")}
      </p>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--color-ft-border)" }}>
      {records.map((r: Rec) => {
        const color = STATUS_COLORS[r.status];
        return (
          <div key={r._id} className="py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{
                    color,
                    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                  }}
                >
                  {t(`status.${r.status}`)}
                </span>
                <span className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
                  {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(r.date))}
                </span>
              </div>
              {r.notes && (
                <p className="text-xs mt-1 truncate" style={{ color: "var(--color-ft-text-3)" }}>
                  {r.notes}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-mono" style={{ color: "var(--color-ft-text-2)" }}>
                {t("bankLabel")}: {formatMoney(r.bankBalanceCents, currency)}
              </p>
              {r.differenceCents !== 0 && (
                <p
                  className="text-xs font-mono"
                  style={{ color: r.differenceCents > 0 ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}
                >
                  {r.differenceCents > 0 ? "+" : ""}{formatMoney(r.differenceCents, currency)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
