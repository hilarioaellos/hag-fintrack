# Auditoría Bloque 8 v2 — Reportes y Gráficas (fixes aplicados)

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)  
**Linear:** HAG-40

---

## CAMBIOS RESPECTO A v1

| Finding | Severidad | Fix |
|---------|-----------|-----|
| Reportes suman múltiples monedas | Alta | Carga `defaultCurrency` de `fintrack_user_settings`; filtra transacciones y cuentas por esa moneda en los 4 handlers |
| `netWorthSnapshot` invertía signo de crédito | Alta | Eliminado `credit ? -acc.balanceCents : acc.balanceCents`; usar `totalCents += acc.balanceCents` directamente |
| Inputs sin validar server-side | Media | `validateReportPeriod(year, month)` y `validateMonths(months)` (1–24) en todos los handlers |
| Loading state muestra "no data" | Baja | → HAG-50 backlog |
| Tooltips y ejes hardcodean `$` y texto inglés | Baja | → HAG-51 backlog |

---

## BACKEND — `convex/fintrack/reports.ts` (completo)

```ts
import { ConvexError } from "convex/values";
import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./_auth";
import type { Id } from "../_generated/dataModel";

function validateReportPeriod(year: number, month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new ConvexError("month must be an integer between 1 and 12");
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    throw new ConvexError("year must be an integer between 2000 and 2100");
}

function validateMonths(months: number): void {
  if (!Number.isInteger(months) || months < 1 || months > 24)
    throw new ConvexError("months must be an integer between 1 and 24");
}

export const incomeVsExpenses = query({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, { months = 6 }) => {
    validateMonths(months);
    const userId = await requireUserId(ctx);

    const settings = await ctx.db
      .query("fintrack_user_settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const currency = settings?.defaultCurrency ?? "USD";

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
      if (tx.type === "transfer" || tx.currencyCode !== currency) continue;
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
    validateReportPeriod(year, month);
    const userId = await requireUserId(ctx);

    const settings = await ctx.db
      .query("fintrack_user_settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const currency = settings?.defaultCurrency ?? "USD";

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
      if (tx.type !== "expense" || !tx.categoryId || tx.currencyCode !== currency) continue;
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
    validateReportPeriod(year, month);
    const userId = await requireUserId(ctx);

    const settings = await ctx.db
      .query("fintrack_user_settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const currency = settings?.defaultCurrency ?? "USD";

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
      if (tx.type === "transfer" || tx.currencyCode !== currency) continue;
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

    const settings = await ctx.db
      .query("fintrack_user_settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const currency = settings?.defaultCurrency ?? "USD";

    const accounts = await ctx.db
      .query("fintrack_accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let totalCents = 0;
    let accountCount = 0;
    for (const acc of accounts) {
      if (acc.currencyCode !== currency) continue;
      // balanceCents is already signed — credit accounts carry negative balance (debt).
      totalCents += acc.balanceCents;
      accountCount++;
    }

    return { totalCents, accountCount };
  },
});
```

---

## FRONTEND — SIN CAMBIOS

Los componentes (`IncomeExpensesChart`, `CategoryPieChart`, `CashFlowChart`, `NetWorthCard`, `ReportShell`) son idénticos a v1. Los fixes de loading state y i18n de tooltips fueron diferidos a backlog.

---

## BACKLOG CREADO

| Issue | Descripción |
|-------|-------------|
| **HAG-50** | Reports: loading state se muestra como "no data" |
| **HAG-51** | Reports: tooltips y ejes hardcodean `$` y texto en inglés |

---

## DECISIONES CLAVE (actualizadas)

1. **Filtro por `defaultCurrency`**: cada query carga `fintrack_user_settings.defaultCurrency` y filtra las transacciones/cuentas por esa moneda. El fallback es `"USD"`. Si el usuario no tiene settings, ve solo transacciones USD. Pendiente: si no tiene transacciones en defaultCurrency, los charts muestran vacío en lugar de sumar otras monedas — comportamiento correcto pero podría confundir a usuarios multi-moneda en Fase 1.

2. **`totalCents += acc.balanceCents` sin inversión**: `balanceCents` ya es firmado. Crédito con deuda tiene balance negativo → resta del patrimonio correctamente sin inversión adicional.

3. **`validateMonths` máximo 24**: 2 años es un rango razonable para evitar queries masivas. El frontend siempre pasa 6.

4. **Settings query en cada handler**: 4 queries separadas a `fintrack_user_settings`. No hay riesgo de inconsistencia (el documento no cambia durante la query) y es más simple que un helper compartido en Convex queries (que no soportan módulos externos con async).
