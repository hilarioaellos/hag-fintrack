# Auditoría Bloque 5 v2 — Presupuesto Mensual (fixes aplicados)

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)  
**Linear:** HAG-37

---

## CAMBIOS RESPECTO A v1

| Finding | Severidad | Fix |
|---------|-----------|-----|
| Backend permite presupuesto de 0 centavos | Media-alta | `validatePlannedCents()` local que llama `validatePositiveCents` + check explícito `=== 0` |
| year/month sin validar en listWithActuals, create, copyFromPreviousMonth | Media | Helper `validateBudgetPeriod(year, month)` con isInteger + rangos; usado en los 3 handlers |
| i18n incompleto (meses hardcodeados, label categoria, texto inglés) | Baja | `Intl.DateTimeFormat(locale)` en MonthNav; `t("category")` y `t("allBudgeted")` en BudgetFormDialog |

---

## BACKEND — `convex/fintrack/budgets.ts` (completo)

```ts
import { ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./_auth";
import { validatePositiveCents } from "./_money";

function validateBudgetPeriod(year: number, month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new ConvexError("month must be an integer between 1 and 12");
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    throw new ConvexError("year must be an integer between 2000 and 2100");
}

function validatePlannedCents(value: number): void {
  validatePositiveCents(value, "amountPlannedCents");
  if (value === 0)
    throw new ConvexError("amountPlannedCents must be greater than 0");
}

export const listWithActuals = query({
  args: { year: v.number(), month: v.number() },
  handler: async (ctx, { year, month }) => {
    validateBudgetPeriod(year, month);
    const userId = await requireUserId(ctx);

    const startMs = new Date(year, month - 1, 1).getTime();
    const endMs = new Date(year, month, 1).getTime();

    const [budgets, monthTransactions] = await Promise.all([
      ctx.db
        .query("fintrack_budgets")
        .withIndex("by_period", (q) =>
          q.eq("userId", userId).eq("year", year).eq("month", month)
        )
        .collect(),
      ctx.db
        .query("fintrack_transactions")
        .withIndex("by_date", (q) =>
          q.eq("userId", userId).gte("date", startMs).lt("date", endMs)
        )
        .filter((q) => q.eq(q.field("type"), "expense"))
        .collect(),
    ]);

    const actualMap: Record<string, number> = {};
    for (const tx of monthTransactions) {
      if (!tx.categoryId) continue;
      actualMap[tx.categoryId] = (actualMap[tx.categoryId] ?? 0) + Math.abs(tx.amountCents);
    }

    return Promise.all(
      budgets.map(async (b) => {
        const category = await ctx.db.get(b.categoryId);
        return { ...b, category, actualCents: actualMap[b.categoryId] ?? 0 };
      })
    );
  },
});

export const create = mutation({
  args: {
    categoryId: v.id("fintrack_categories"),
    year: v.number(),
    month: v.number(),
    amountPlannedCents: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    validateBudgetPeriod(args.year, args.month);
    validatePlannedCents(args.amountPlannedCents);

    const existing = await ctx.db
      .query("fintrack_budgets")
      .withIndex("by_period", (q) =>
        q.eq("userId", userId).eq("year", args.year).eq("month", args.month)
      )
      .filter((q) => q.eq(q.field("categoryId"), args.categoryId))
      .first();
    if (existing)
      throw new ConvexError("A budget already exists for this category and month");

    return ctx.db.insert("fintrack_budgets", { userId, ...args });
  },
});

export const update = mutation({
  args: {
    id: v.id("fintrack_budgets"),
    amountPlannedCents: v.number(),
  },
  handler: async (ctx, { id, amountPlannedCents }) => {
    const userId = await requireUserId(ctx);
    const budget = await ctx.db.get(id);
    if (!budget || budget.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    validatePlannedCents(amountPlannedCents);
    await ctx.db.patch(id, { amountPlannedCents });
  },
});

export const remove = mutation({
  args: { id: v.id("fintrack_budgets") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const budget = await ctx.db.get(id);
    if (!budget || budget.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    await ctx.db.delete(id);
  },
});

export const copyFromPreviousMonth = mutation({
  args: { year: v.number(), month: v.number() },
  handler: async (ctx, { year, month }) => {
    validateBudgetPeriod(year, month);
    const userId = await requireUserId(ctx);

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const [previous, existing] = await Promise.all([
      ctx.db
        .query("fintrack_budgets")
        .withIndex("by_period", (q) =>
          q.eq("userId", userId).eq("year", prevYear).eq("month", prevMonth)
        )
        .collect(),
      ctx.db
        .query("fintrack_budgets")
        .withIndex("by_period", (q) =>
          q.eq("userId", userId).eq("year", year).eq("month", month)
        )
        .collect(),
    ]);

    const existingCategoryIds = new Set(existing.map((b) => b.categoryId));
    const toCreate = previous.filter((b) => !existingCategoryIds.has(b.categoryId));

    for (const b of toCreate) {
      await ctx.db.insert("fintrack_budgets", {
        userId,
        year,
        month,
        categoryId: b.categoryId,
        amountPlannedCents: b.amountPlannedCents,
      });
    }
    return toCreate.length;
  },
});
```

---

## FRONTEND — ARCHIVOS MODIFICADOS

### `src/components/budget/MonthNav.tsx`

```tsx
"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";

interface Props {
  year: number;
  month: number; // 1–12
  onChange: (year: number, month: number) => void;
}

export function MonthNav({ year, month, onChange }: Props) {
  const locale = useLocale();

  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(year, month - 1, 1)
  );
  const display = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const prev = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const next = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={prev}
        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-ft-surface-2)]"
        style={{ color: "var(--color-ft-text-3)" }}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: "var(--color-ft-text)" }}>
        {display} {year}
      </span>
      <button onClick={next}
        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-ft-surface-2)]"
        style={{ color: "var(--color-ft-text-3)" }}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
```

### `src/components/budget/BudgetFormDialog.tsx` — cambios relevantes

```tsx
// Antes:
<Label>{tc("filter")}</Label>
<p>All categories already have a budget this month.</p>

// Después:
<Label>{t("category")}</Label>
<p>{t("allBudgeted")}</p>
```

---

## MENSAJES — CLAVES NUEVAS

```json
// en.json
"category": "Category",
"allBudgeted": "All categories already have a budget this month."

// es.json
"category": "Categoría",
"allBudgeted": "Todas las categorías ya tienen presupuesto este mes."
```

---

## ARCHIVOS SIN CAMBIOS RESPECTO A v1

- `BudgetRow.tsx`
- `BudgetList.tsx`
- `budget/page.tsx`

---

## DECISIONES CLAVE (actualizadas)

1. **`validatePlannedCents`** es un helper local en `budgets.ts` que envuelve `validatePositiveCents` y agrega el check `=== 0`. No se modificó `_money.ts` para no afectar otros módulos que usan `validatePositiveCents` y sí aceptan 0 (ej. `minimumPaymentCents` en tarjetas).

2. **Rango de año 2000–2100**: arbitrario pero razonable. Evita años negativos, fraccionales o absurdos sin over-engineering.

3. **`Intl.DateTimeFormat(locale)`**: los nombres de meses los provee el sistema según el locale activo (`en` → "January", `es` → "enero"). No requiere agregar 24 strings a los archivos de mensajes. La capitalización manual (`charAt(0).toUpperCase()`) cubre que algunos locales retornan el mes en minúscula.
