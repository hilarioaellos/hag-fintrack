"use client";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { localMonthRange } from "@/lib/dates";
import type { Doc } from "@convex-api/dataModel";

export type CatRow = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  totalCents: number;
};

/**
 * Computes category breakdown client-side from transactions.list (local-time boundaries).
 * This avoids the UTC-midnight off-by-one issue where transactions stored at
 * June 1 00:00 UTC (= May 31 local) were excluded from May backend queries.
 * Returns undefined while loading, [] when there is no data.
 */
export function useCategoryBreakdown(
  year: number,
  month: number,
  currencyCode: string,
  txType: "expense" | "income"
): CatRow[] | undefined {
  const { startMs, endMs } = localMonthRange(year, month);

  // endMs is exclusive (first ms of next month local) — transactions.list uses lte, so subtract 1
  const txs = useQuery(api.fintrack.transactions.list, {
    startDate: startMs,
    endDate: endMs - 1,
  });
  const catsWithSettings = useQuery(api.fintrack.categories.listWithSettings);

  return useMemo(() => {
    if (txs === undefined || catsWithSettings === undefined) return undefined;

    const excluded = new Set(
      (catsWithSettings as (Doc<"fintrack_categories"> & { excludeFromReports: boolean })[])
        .filter((c) => c.forceExclude || c.excludeFromReports)
        .map((c) => c._id as string)
    );

    const catMap = new Map(
      (catsWithSettings as (Doc<"fintrack_categories"> & { excludeFromReports: boolean })[])
        .map((c) => [c._id as string, c])
    );

    const totals: Record<string, number> = {};
    let uncatCents = 0;

    for (const tx of txs as Doc<"fintrack_transactions">[]) {
      if (tx.type !== txType || tx.currencyCode !== currencyCode) continue;
      if (tx.categoryId) {
        if (excluded.has(tx.categoryId as string)) continue;
        const id = tx.categoryId as string;
        totals[id] = (totals[id] ?? 0) + Math.abs(tx.amountCents);
      } else {
        uncatCents += Math.abs(tx.amountCents);
      }
    }

    const entries: CatRow[] = Object.entries(totals).map(([catId, totalCents]) => {
      const cat = catMap.get(catId);
      return {
        categoryId: catId,
        name: cat?.name ?? "Unknown",
        icon: cat?.icon ?? "📦",
        color: cat?.color ?? "#94a3b8",
        totalCents,
      };
    });

    if (uncatCents > 0) {
      entries.push({
        categoryId: "__none__",
        name: "__none__",
        icon: "🏷️",
        color: "#64748b",
        totalCents: uncatCents,
      });
    }

    return entries.sort((a, b) => b.totalCents - a.totalCents);
  }, [txs, catsWithSettings, txType, currencyCode]);
}
