# Auditoría Bloque 8 — Reportes y Gráficas

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)  
**Linear:** HAG-40

---

## ARCHIVOS NUEVOS — BACKEND (HAG Partner)

### `convex/fintrack/reports.ts`

```ts
import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./_auth";
import type { Id } from "../_generated/dataModel";

export const incomeVsExpenses = query({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, { months = 6 }) => {
    const userId = await requireUserId(ctx);

    const now = new Date();
    const endMs = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const startMs = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getTime();

    const allTxs = await ctx.db
      .query("fintrack_transactions")
      .withIndex("by_date", (q) =>
        q.eq("userId", userId).gte("date", startMs).lt("date", endMs)
      )
      .collect();

    const buckets: Record<string, { year: number; month: number; income: number; expenses: number }> = {};

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      buckets[key] = { year: d.getFullYear(), month: d.getMonth() + 1, income: 0, expenses: 0 };
    }

    for (const tx of allTxs) {
      if (tx.type === "transfer") continue;
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!buckets[key]) continue;
      if (tx.type === "income") buckets[key].income += tx.amountCents;
      else if (tx.type === "expense") buckets[key].expenses += Math.abs(tx.amountCents);
    }

    return Object.values(buckets);
  },
});

export const expensesByCategory = query({
  args: { year: v.number(), month: v.number() },
  handler: async (ctx, { year, month }) => {
    const userId = await requireUserId(ctx);

    const startMs = new Date(year, month - 1, 1).getTime();
    const endMs = new Date(year, month, 1).getTime();

    const txs = await ctx.db
      .query("fintrack_transactions")
      .withIndex("by_date", (q) =>
        q.eq("userId", userId).gte("date", startMs).lt("date", endMs)
      )
      .collect();

    const totals: Record<string, number> = {};
    for (const tx of txs) {
      if (tx.type !== "expense" || !tx.categoryId) continue;
      totals[tx.categoryId] = (totals[tx.categoryId] ?? 0) + Math.abs(tx.amountCents);
    }

    const entries = await Promise.all(
      Object.entries(totals).map(async ([catId, totalCents]) => {
        const cat = await ctx.db.get(catId as Id<"fintrack_categories">);
        return {
          categoryId: catId,
          name: cat?.name ?? "Unknown",
          icon: cat?.icon ?? "📦",
          color: cat?.color ?? "#94a3b8",
          totalCents,
        };
      })
    );

    return entries.sort((a, b) => b.totalCents - a.totalCents);
  },
});

export const cashFlowByDay = query({
  args: { year: v.number(), month: v.number() },
  handler: async (ctx, { year, month }) => {
    const userId = await requireUserId(ctx);

    const startMs = new Date(year, month - 1, 1).getTime();
    const endMs = new Date(year, month, 1).getTime();
    const daysInMonth = new Date(year, month, 0).getDate();

    const txs = await ctx.db
      .query("fintrack_transactions")
      .withIndex("by_date", (q) =>
        q.eq("userId", userId).gte("date", startMs).lt("date", endMs)
      )
      .collect();

    const byDay: Record<number, { income: number; expenses: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) byDay[d] = { income: 0, expenses: 0 };

    for (const tx of txs) {
      if (tx.type === "transfer") continue;
      const day = new Date(tx.date).getDate();
      if (tx.type === "income") byDay[day].income += tx.amountCents;
      else if (tx.type === "expense") byDay[day].expenses += Math.abs(tx.amountCents);
    }

    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      incomeCents: byDay[i + 1].income,
      expenseCents: byDay[i + 1].expenses,
    }));
  },
});

export const netWorthSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    const accounts = await ctx.db
      .query("fintrack_accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let totalCents = 0;
    for (const acc of accounts) {
      totalCents += acc.type === "credit" ? -acc.balanceCents : acc.balanceCents;
    }

    return { totalCents, accountCount: accounts.length };
  },
});
```

---

## ARCHIVOS NUEVOS — FRONTEND (hag-fintrack)

### `src/components/reports/IncomeExpensesChart.tsx`

```tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations, useLocale } from "next-intl";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

function formatK(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(0)}`;
}

export function IncomeExpensesChart() {
  const t = useTranslations("reports");
  const locale = useLocale();
  const data = useQuery(api.fintrack.reports.incomeVsExpenses, { months: 6 });

  type Row = { year: number; month: number; income: number; expenses: number };
  const formatted = (data ?? []).map((d: Row) => ({
    label: new Intl.DateTimeFormat(locale, { month: "short" })
      .format(new Date(d.year, d.month - 1, 1)),
    income: d.income,
    expenses: d.expenses,
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
        {t("last6Months")}
      </p>
      {formatted.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formatted} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ft-border)" vertical={false} />
            <XAxis dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-ft-text-3)" }}
              axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatK}
              tick={{ fontSize: 11, fill: "var(--color-ft-text-3)" }}
              axisLine={false} tickLine={false} width={40} />
            <Tooltip
              formatter={(value: number, name: string) => [
                `$${(value / 100).toFixed(2)}`,
                name === "income" ? t("income") : t("expenses"),
              ]}
              contentStyle={{
                backgroundColor: "var(--color-ft-surface-2)",
                border: "1px solid var(--color-ft-border)",
                borderRadius: "8px", fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-ft-text)", marginBottom: 4 }}
            />
            <Legend formatter={(value) => (
              <span style={{ fontSize: 11, color: "var(--color-ft-text-3)" }}>
                {value === "income" ? t("income") : t("expenses")}
              </span>
            )} />
            <Bar dataKey="income" fill="#4ade80" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expenses" fill="#f87171" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

---

### `src/components/reports/CategoryPieChart.tsx`

```tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { MonthNav } from "@/components/budget/MonthNav";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function CategoryPieChart() {
  const t = useTranslations("reports");
  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const data = useQuery(api.fintrack.reports.expensesByCategory, { year, month });

  type CatRow = { categoryId: string; name: string; icon: string; color: string; totalCents: number };
  const total = (data ?? []).reduce((s: number, d: CatRow) => s + d.totalCents, 0);

  return (
    <div className="space-y-3">
      <MonthNav year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
      {!data || data.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <div className="flex items-start gap-4">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={data} dataKey="totalCents" nameKey="name"
                cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}>
                {(data as CatRow[]).map((entry: CatRow, i: number) => (
                  <Cell key={i} fill={entry.color ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`$${(value / 100).toFixed(2)}`]}
                contentStyle={{
                  backgroundColor: "var(--color-ft-surface-2)",
                  border: "1px solid var(--color-ft-border)",
                  borderRadius: "8px", fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5 min-w-0 pt-2">
            {(data as CatRow[]).slice(0, 7).map((d: CatRow) => (
              <div key={d.categoryId} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: d.color ?? "#94a3b8" }} />
                  <span className="text-xs truncate" style={{ color: "var(--color-ft-text-2)" }}>
                    {d.icon} {d.name}
                  </span>
                </div>
                <span className="text-xs font-mono shrink-0" style={{ color: "var(--color-ft-text-3)" }}>
                  {total > 0 ? `${((d.totalCents / total) * 100).toFixed(0)}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### `src/components/reports/CashFlowChart.tsx`

```tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { MonthNav } from "@/components/budget/MonthNav";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function CashFlowChart() {
  const t = useTranslations("reports");
  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const data = useQuery(api.fintrack.reports.cashFlowByDay, { year, month });

  type DayRow = { day: number; incomeCents: number; expenseCents: number };
  const hasData = (data ?? []).some((d: DayRow) => d.incomeCents > 0 || d.expenseCents > 0);

  return (
    <div className="space-y-3">
      <MonthNav year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
      {!hasData ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--color-ft-text-3)" }}>
          {t("noData")}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ft-border)" vertical={false} />
            <XAxis dataKey="day"
              tick={{ fontSize: 10, fill: "var(--color-ft-text-3)" }}
              axisLine={false} tickLine={false} interval={4} />
            <YAxis tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
              tick={{ fontSize: 10, fill: "var(--color-ft-text-3)" }}
              axisLine={false} tickLine={false} width={44} />
            <Tooltip
              formatter={(value: number, name: string) => [
                `$${(value / 100).toFixed(2)}`,
                name === "incomeCents" ? t("income") : t("expenses"),
              ]}
              labelFormatter={(label) => `Day ${label}`}
              contentStyle={{
                backgroundColor: "var(--color-ft-surface-2)",
                border: "1px solid var(--color-ft-border)",
                borderRadius: "8px", fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-ft-text)", marginBottom: 4 }}
            />
            <Bar dataKey="incomeCents" fill="#4ade80" radius={[2, 2, 0, 0]} />
            <Bar dataKey="expenseCents" fill="#f87171" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

---

### `src/components/reports/NetWorthCard.tsx`

```tsx
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
    return <p className="text-sm py-4" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>;
  }

  const isPositive = data.totalCents >= 0;
  return (
    <div className="flex flex-col gap-1 py-2">
      <p className="text-3xl font-bold ft-num"
        style={{ color: isPositive ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}>
        {isPositive ? "" : "-"}{formatMoney(Math.abs(data.totalCents))}
      </p>
      <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
        {data.accountCount} {t("accounts")}
      </p>
    </div>
  );
}
```

---

### `src/components/reports/ReportShell.tsx`

```tsx
"use client";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const IncomeExpensesChart = dynamic(
  () => import("./IncomeExpensesChart").then((m) => ({ default: m.IncomeExpensesChart })),
  { ssr: false }
);
const CategoryPieChart = dynamic(
  () => import("./CategoryPieChart").then((m) => ({ default: m.CategoryPieChart })),
  { ssr: false }
);
const CashFlowChart = dynamic(
  () => import("./CashFlowChart").then((m) => ({ default: m.CashFlowChart })),
  { ssr: false }
);
const NetWorthCard = dynamic(
  () => import("./NetWorthCard").then((m) => ({ default: m.NetWorthCard })),
  { ssr: false }
);

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}>
      <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-ft-text)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

export function ReportShell() {
  const t = useTranslations("reports");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReportCard title={t("incomeVsExpenses")}><IncomeExpensesChart /></ReportCard>
      <ReportCard title={t("byCategory")}><CategoryPieChart /></ReportCard>
      <ReportCard title={t("cashFlow")}><CashFlowChart /></ReportCard>
      <ReportCard title={t("netWorthOverTime")}><NetWorthCard /></ReportCard>
    </div>
  );
}
```

---

## ARCHIVO MODIFICADO

### `src/app/(dashboard)/reports/page.tsx`

```tsx
import { getTranslations } from "next-intl/server";
import { ReportShell } from "@/components/reports/ReportShell";

export default async function ReportsPage() {
  const t = await getTranslations("reports");
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
      <ReportShell />
    </div>
  );
}
```

---

## MENSAJES — CLAVES NUEVAS

```json
// en.json — reports namespace extendido
"subtitle": "Analyze your financial data",
"income": "Income",
"expenses": "Expenses",
"netWorth": "Net Worth",
"accounts": "accounts",
"noData": "No data for this period",
"last6Months": "Last 6 months"

// es.json — mismo
"subtitle": "Analiza tus datos financieros",
"income": "Ingresos",
"expenses": "Gastos",
"netWorth": "Patrimonio Neto",
"accounts": "cuentas",
"noData": "Sin datos para este período",
"last6Months": "Últimos 6 meses"
```

---

## DECISIONES CLAVE

1. **Un solo `.collect()` para `incomeVsExpenses`**: carga todas las transacciones del rango de N meses en una query y agrupa en JS. Más eficiente que N queries separadas.

2. **`dynamic(..., { ssr: false })`**: recharts accede a `window`/`document` en inicialización — falla en SSR de Next.js App Router. Todos los charts se cargan solo en el cliente.

3. **Colores hardcodeados en charts**: `#4ade80` (income) y `#f87171` (expenses). Las variables CSS `var(--color-ft-*)` no siempre resuelven en atributos SVG de recharts en todos los navegadores — se usan hex directos que coinciden visualmente con la paleta V3.

4. **`expensesByCategory` es N+1**: una `.get()` por categoría única. Con el volumen de Fase 1 (pocas categorías por mes) es aceptable. No hay API de batch en Convex.

5. **`netWorthSnapshot` es snapshot instantáneo**: usa `balanceCents` materializado de las cuentas activas. No hay histórico de patrimonio — no se puede graficar evolución sin una tabla de snapshots dedicada (backlog futuro).

6. **`cashFlowByDay` usa `new Date(tx.date).getDate()`**: la fecha del día se extrae en tiempo local del servidor Convex (UTC). Puede diferir del día local del usuario si está en timezone distinto. Edge case menor, aceptable para Fase 1.
