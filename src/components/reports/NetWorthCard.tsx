"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { useTranslations } from "next-intl";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

function NetWorthTooltip({
  active, payload, currencyCode,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  currencyCode: string;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const isPos = val >= 0;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs"
      style={{
        backgroundColor: "var(--color-ft-surface-2)",
        borderColor: "var(--color-ft-border)",
        color: "var(--color-ft-text)",
      }}
    >
      <span style={{ color: isPos ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}>
        {isPos ? "" : "-"}{formatMoney(Math.abs(val), currencyCode)}
      </span>
    </div>
  );
}

export function NetWorthCard({ currencyCode }: { currencyCode: string }) {
  const t = useTranslations("reports");
  const snapshot = useQuery(api.fintrack.reports.netWorthSnapshot, { currencyCode });
  const history = useQuery(api.fintrack.reports.netWorthHistory, { currencyCode });

  const isLoading = snapshot === undefined || history === undefined;

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg h-52" style={{ backgroundColor: "var(--color-ft-surface-2)" }} />
    );
  }

  const isPositive = snapshot.totalCents >= 0;
  const hasHistory = history.length > 1;

  return (
    <div className="space-y-4">
      {/* Snapshot row */}
      <div className="flex items-baseline gap-3">
        <p
          className="text-3xl font-bold ft-num"
          style={{ color: isPositive ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}
        >
          {isPositive ? "" : "-"}{formatMoney(Math.abs(snapshot.totalCents), currencyCode)}
        </p>
        <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
          {snapshot.accountCount} {t("accounts")}
        </p>
      </div>

      {/* Line chart */}
      {!hasHistory ? (
        <p className="text-xs text-center py-8" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-ft-border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--color-ft-text-3)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v: number) => formatMoneyCompact(v, currencyCode)}
              tick={{ fontSize: 10, fill: "var(--color-ft-text-3)" }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              content={<NetWorthTooltip currencyCode={currencyCode} />}
              cursor={{ stroke: "var(--color-ft-border)", strokeWidth: 1 }}
            />
            <ReferenceLine y={0} stroke="var(--color-ft-border)" strokeDasharray="4 2" />
            <Line
              type="monotone"
              dataKey="netWorthCents"
              stroke="var(--color-ft-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-ft-primary)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
