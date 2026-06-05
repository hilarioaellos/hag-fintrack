"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Id } from "@convex-api/dataModel";

type LookbackOption = 3 | 6 | 12;

interface EstimateRow {
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  averageCents: number;
  totalCents: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  budgetedCategoryIds: Set<string>;
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

export function HistoryEstimateDialog({ open, onOpenChange, year, month, budgetedCategoryIds }: Props) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const applyMutation = useMutation(api.fintrack.budgets.applyHistoryEstimate);

  const [lookback, setLookback] = useState<LookbackOption>(3);
  const [overwrite, setOverwrite] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const estimateData = useQuery(
    api.fintrack.budgets.historyEstimate,
    open ? { year, month, lookbackMonths: lookback } : "skip"
  );
  const rows = estimateData?.rows;
  const currencyCode = estimateData?.currencyCode ?? "USD";

  // Auto-select all rows when data loads
  useEffect(() => {
    if (rows) {
      setSelected(new Set(rows.map((r: EstimateRow) => r.categoryId)));
    }
  }, [rows, lookback]);

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (all: boolean) => {
    if (!rows) return;
    setSelected(all ? new Set(rows.map((r: EstimateRow) => r.categoryId)) : new Set());
  };

  const handleApply = async () => {
    if (!rows || selected.size === 0) return;
    setResultMsg(null);
    setLoading(true);
    try {
      const entries = rows
        .filter((r: EstimateRow) => selected.has(r.categoryId))
        .map((r: EstimateRow) => ({
          categoryId: r.categoryId as Id<"fintrack_categories">,
          amountPlannedCents: r.averageCents,
        }));
      const result = await applyMutation({ year, month, entries, overwrite });
      setResultMsg(
        t("estimateApplied")
          .replace("{created}", String(result.created))
          .replace("{updated}", String(result.updated))
          .replace("{skipped}", String(result.skipped))
      );
    } catch (err) {
      setResultMsg(err instanceof Error ? err.message : tc("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      setResultMsg(null);
      setSelected(new Set());
    }
    onOpenChange(o);
  };

  const LOOKBACK_OPTIONS: LookbackOption[] = [3, 6, 12];
  const lookbackKey: Record<LookbackOption, string> = {
    3: t("lookback3"),
    6: t("lookback6"),
    12: t("lookback12"),
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg"
        style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--color-ft-text)" }}>
            {t("historyEstimateTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
                {t("lookbackMonths")}:
              </span>
              <Select
                value={String(lookback)}
                onValueChange={(v) => { if (v) setLookback(Number(v) as LookbackOption); }}
              >
                <SelectTrigger className="w-32 h-7 text-xs" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOKBACK_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{lookbackKey[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer"
              style={{ color: "var(--color-ft-text-2)" }}>
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="accent-[var(--color-ft-primary)]"
              />
              {t("overwriteExisting")}
            </label>
          </div>

          {/* Subtitle */}
          <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
            {t("historyEstimateSubtitle").replace("{n}", String(lookback))}
          </p>

          {/* Table */}
          <div
            className="rounded-lg border overflow-hidden max-h-72 overflow-y-auto"
            style={{ borderColor: "var(--color-ft-border)" }}
          >
            {estimateData === undefined ? (
              <p className="text-xs p-4" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>
            ) : !rows || rows.length === 0 ? (
              <p className="text-xs p-4" style={{ color: "var(--color-ft-text-3)" }}>{t("noHistoryData")}</p>
            ) : (
              <>
                {/* Header */}
                <div
                  className="flex items-center px-3 py-1.5 text-[10px] font-medium border-b"
                  style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-3)" }}
                >
                  <span className="w-5" />
                  <span className="flex-1">{t("category")}</span>
                  <span className="w-24 text-right">{t("estimateAvg")}</span>
                  {!overwrite && <span className="w-16 text-right text-[9px]">{t("estimateStatusHeader")}</span>}
                </div>
                {rows.map((row: EstimateRow) => {
                  const isChecked = selected.has(row.categoryId);
                  const alreadyBudgeted = budgetedCategoryIds.has(row.categoryId);
                  return (
                    <label
                      key={row.categoryId}
                      className="flex items-center px-3 py-2 gap-2 cursor-pointer border-b last:border-0"
                      style={{
                        borderColor: "var(--color-ft-border)",
                        backgroundColor: isChecked ? "color-mix(in srgb, var(--color-ft-primary) 5%, transparent)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(row.categoryId)}
                        className="accent-[var(--color-ft-primary)] shrink-0"
                      />
                      <span
                        className="flex-1 text-xs truncate"
                        style={{
                          color: "var(--color-ft-text)",
                          paddingLeft: row.parentId ? "1rem" : "0",
                        }}
                      >
                        {row.parentId ? "↳ " : ""}{row.categoryName}
                      </span>
                      <span
                        className="w-24 text-right text-xs font-mono font-semibold"
                        style={{ color: "var(--color-ft-primary)" }}
                      >
                        {formatMoney(row.averageCents, currencyCode)}
                      </span>
                      {!overwrite && (
                        <span
                          className="w-16 text-right text-[10px]"
                          style={{ color: alreadyBudgeted ? "var(--color-ft-warn)" : "var(--color-ft-text-3)" }}
                        >
                          {alreadyBudgeted ? t("estimateStatusBudgeted") : t("estimateStatusNew")}
                        </span>
                      )}
                    </label>
                  );
                })}
              </>
            )}
          </div>

          {/* Select all / deselect all */}
          {rows && rows.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={() => handleSelectAll(true)}
                className="text-xs underline"
                style={{ color: "var(--color-ft-text-3)" }}
              >
                {t("selectAll")}
              </button>
              <button
                onClick={() => handleSelectAll(false)}
                className="text-xs underline"
                style={{ color: "var(--color-ft-text-3)" }}
              >
                {t("deselectAll")}
              </button>
            </div>
          )}

          {/* Result message */}
          {resultMsg && (
            <p className="text-xs" style={{ color: "var(--color-ft-good)" }}>{resultMsg}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleApply}
            disabled={loading || !rows || selected.size === 0}
            style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
          >
            {loading ? tc("loading") : `${t("applyEstimate")} (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
