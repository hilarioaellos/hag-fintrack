"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceivableCard } from "./ReceivableCard";
import { ReceivableFormDialog } from "./ReceivableFormDialog";
import type { Doc } from "@convex-api/dataModel";

type Receivable = Doc<"fintrack_receivables">;
type StatusFilter = "all" | "active" | "partially_paid" | "fully_paid" | "written_off";

const FILTERS: StatusFilter[] = ["all", "active", "partially_paid", "fully_paid", "written_off"];

export function ReceivablesList() {
  const t = useTranslations("receivables");
  const tc = useTranslations("common");
  const receivables = useQuery(api.fintrack.receivables.list);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("active");

  if (receivables === undefined) {
    return <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>;
  }

  const visible = filter === "all"
    ? receivables
    : receivables.filter((r: Receivable) => r.status === filter);

  // Summary — only active/partial
  const outstanding = receivables
    .filter((r: Receivable) => r.status === "active" || r.status === "partially_paid")
    .reduce((s: number, r: Receivable) => s + r.outstandingBalance, 0);

  const currencies = new Set(receivables.map((r: Receivable) => r.currencyCode));
  const singleCurrency = currencies.size === 1 ? receivables[0]?.currencyCode ?? null : null;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {singleCurrency && outstanding > 0 && (
          <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>
            {t("totalOutstanding")}:{" "}
            <span className="font-mono font-semibold" style={{ color: "var(--color-ft-warn)" }}>
              {formatMoney(outstanding, singleCurrency)}
            </span>
          </p>
        )}
        <Button
          onClick={() => setAddOpen(true)}
          className="ml-auto"
          style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {t("addReceivable")}
        </Button>
      </div>

      {/* Status filter tabs */}
      {receivables.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 text-xs rounded-full border transition-colors"
              style={{
                backgroundColor: filter === f ? "var(--color-ft-primary)" : "var(--color-ft-surface-2)",
                color: filter === f ? "#080d18" : "var(--color-ft-text-3)",
                borderColor: filter === f ? "var(--color-ft-primary)" : "var(--color-ft-border)",
              }}
            >
              {f === "all" ? tc("all") : t(`status.${f}`)}
              {f !== "all" && (
                <span className="ml-1.5 opacity-70">
                  {receivables.filter((r: Receivable) => r.status === f).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Cards or empty state */}
      {visible.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-10 flex flex-col items-center gap-2"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>
            {receivables.length === 0 ? t("noReceivables") : tc("noResults")}
          </p>
          {receivables.length === 0 && (
            <p className="text-xs text-center max-w-xs" style={{ color: "var(--color-ft-text-3)" }}>
              {t("noReceivablesHint")}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((r: Receivable) => (
            <ReceivableCard key={r._id} receivable={r} />
          ))}
        </div>
      )}

      <ReceivableFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
