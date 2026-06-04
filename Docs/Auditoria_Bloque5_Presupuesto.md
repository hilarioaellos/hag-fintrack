# Auditoría Bloque 5 — Presupuesto Mensual

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)  
**Linear:** HAG-37

---

## ARCHIVOS NUEVOS — BACKEND (HAG Partner)

### `convex/fintrack/budgets.ts`

```ts
import { ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./_auth";
import { validatePositiveCents } from "./_money";

export const listWithActuals = query({
  args: { year: v.number(), month: v.number() },
  handler: async (ctx, { year, month }) => {
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

    // Build category → actual spending map
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
    validatePositiveCents(args.amountPlannedCents, "amountPlannedCents");
    if (args.month < 1 || args.month > 12 || !Number.isInteger(args.month))
      throw new ConvexError("month must be an integer between 1 and 12");

    // One budget per category per period
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
    validatePositiveCents(amountPlannedCents, "amountPlannedCents");
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

## ARCHIVOS NUEVOS — FRONTEND (hag-fintrack)

### `src/components/budget/MonthNav.tsx`

```tsx
"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface Props {
  year: number;
  month: number; // 1–12
  onChange: (year: number, month: number) => void;
}

export function MonthNav({ year, month, onChange }: Props) {
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
      <button
        onClick={prev}
        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-ft-surface-2)]"
        style={{ color: "var(--color-ft-text-3)" }}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: "var(--color-ft-text)" }}>
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button
        onClick={next}
        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-ft-surface-2)]"
        style={{ color: "var(--color-ft-text-3)" }}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
```

---

### `src/components/budget/BudgetFormDialog.tsx`

```tsx
"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Doc, Id } from "@convex-api/dataModel";

type Budget = Doc<"fintrack_budgets"> & {
  category: Doc<"fintrack_categories"> | null;
  actualCents: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  budget?: Budget;
  budgetedCategoryIds: Set<string>;
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

export function BudgetFormDialog({ open, onOpenChange, year, month, budget, budgetedCategoryIds }: Props) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const categories = useQuery(api.fintrack.categories.list);
  const createMutation = useMutation(api.fintrack.budgets.create);
  const updateMutation = useMutation(api.fintrack.budgets.update);

  const isEdit = !!budget;

  const availableCategories = (categories ?? []).filter(
    (c: Doc<"fintrack_categories">) =>
      isEdit ? true : !budgetedCategoryIds.has(c._id)
  );

  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "");
  const [amount, setAmount] = useState(budget ? String(budget.amountPlannedCents / 100) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setCategoryId(budget?.categoryId ?? "");
    setAmount(budget ? String(budget.amountPlannedCents / 100) : "");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cents = dollarsToCents(parseFloat(amount) || 0);
    if (cents <= 0) { setError("Amount must be greater than 0"); return; }

    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({ id: budget._id, amountPlannedCents: cents });
      } else {
        if (!categoryId) { setError("Select a category"); setLoading(false); return; }
        await createMutation({
          categoryId: categoryId as Id<"fintrack_categories">,
          year,
          month,
          amountPlannedCents: cents,
        });
      }
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--color-ft-text)" }}>
            {isEdit ? t("editBudget") : t("addBudget")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{tc("filter")}</Label>
              {availableCategories.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>
                  All categories already have a budget this month.
                </p>
              ) : (
                <Select value={categoryId} onValueChange={(v) => { if (v) setCategoryId(v); }}>
                  <SelectTrigger className="w-full" style={inputStyle}>
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((c: Doc<"fintrack_categories">) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {isEdit && budget.category && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--color-ft-surface-2)" }}>
              <span className="text-lg">{budget.category.icon}</span>
              <span className="text-sm font-medium" style={{ color: "var(--color-ft-text)" }}>
                {budget.category.name}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("planned")}</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
          </div>

          {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
            >
              {loading ? tc("loading") : isEdit ? tc("save") : t("addBudget")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### `src/components/budget/BudgetRow.tsx`

```tsx
"use client";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Doc } from "@convex-api/dataModel";
import { BudgetFormDialog } from "./BudgetFormDialog";

type Budget = Doc<"fintrack_budgets"> & {
  category: Doc<"fintrack_categories"> | null;
  actualCents: number;
};

function progressColor(ratio: number): string {
  if (ratio >= 1) return "var(--color-ft-bad)";
  if (ratio >= 0.8) return "var(--color-ft-warn)";
  return "var(--color-ft-good)";
}

interface Props {
  budget: Budget;
  year: number;
  month: number;
  budgetedCategoryIds: Set<string>;
}

export function BudgetRow({ budget, year, month, budgetedCategoryIds }: Props) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const remove = useMutation(api.fintrack.budgets.remove);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { actualCents, amountPlannedCents, category } = budget;
  const ratio = amountPlannedCents > 0 ? actualCents / amountPlannedCents : 0;
  const pct = Math.min(ratio * 100, 100);
  const remainingCents = amountPlannedCents - actualCents;
  const isOver = remainingCents < 0;
  const color = progressColor(ratio);

  return (
    <>
      <div
        className="px-4 py-3 flex flex-col gap-2 group border-b last:border-0"
        style={{ borderColor: "var(--color-ft-border)" }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{category?.icon ?? "📦"}</span>
            <span className="text-sm font-medium truncate" style={{ color: "var(--color-ft-text)" }}>
              {category?.name ?? "Unknown"}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-sm font-mono" style={{ color: "var(--color-ft-text)" }}>
                {formatMoney(actualCents)}{" "}
                <span style={{ color: "var(--color-ft-text-3)" }}>
                  {t("of")} {formatMoney(amountPlannedCents)}
                </span>
              </p>
              <p
                className="text-xs font-medium"
                style={{ color: isOver ? "var(--color-ft-bad)" : "var(--color-ft-text-3)" }}
              >
                {isOver
                  ? `${formatMoney(-remainingCents)} ${t("over")}`
                  : `${formatMoney(remainingCents)} ${t("remaining")}`}
              </p>
            </div>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--color-ft-text-3)" }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-6 z-20 rounded-lg border shadow-lg py-1 min-w-[120px]"
                    style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)" }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                      style={{ color: "var(--color-ft-text-2)" }}
                    >
                      <Pencil className="h-3 w-3" /> {tc("edit")}
                    </button>
                    <button
                      onClick={async () => { setMenuOpen(false); await remove({ id: budget._id }); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                      style={{ color: "var(--color-ft-bad)" }}
                    >
                      <Trash2 className="h-3 w-3" /> {tc("delete")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-ft-border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <p className="text-[10px] font-mono" style={{ color }}>
            {(ratio * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <BudgetFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        year={year}
        month={month}
        budget={budget}
        budgetedCategoryIds={budgetedCategoryIds}
      />
    </>
  );
}
```

---

### `src/components/budget/BudgetList.tsx`

```tsx
"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Plus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthNav } from "./MonthNav";
import { BudgetRow } from "./BudgetRow";
import { BudgetFormDialog } from "./BudgetFormDialog";
import type { Doc } from "@convex-api/dataModel";

type Budget = Doc<"fintrack_budgets"> & {
  category: Doc<"fintrack_categories"> | null;
  actualCents: number;
};

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function BudgetList() {
  const t = useTranslations("budget");
  const tc = useTranslations("common");

  const [{ year, month }, setPeriod] = useState(currentYearMonth);
  const [addOpen, setAddOpen] = useState(false);
  const [copying, setCopying] = useState(false);

  const budgets = useQuery(api.fintrack.budgets.listWithActuals, { year, month });
  const copyMutation = useMutation(api.fintrack.budgets.copyFromPreviousMonth);

  const budgetedCategoryIds: Set<string> = new Set(
    (budgets ?? []).map((b: Budget) => b.categoryId as string)
  );

  const totalPlanned = (budgets ?? []).reduce((s: number, b: Budget) => s + b.amountPlannedCents, 0);
  const totalActual  = (budgets ?? []).reduce((s: number, b: Budget) => s + b.actualCents, 0);
  const totalBalance = totalPlanned - totalActual;

  const handleCopy = async () => {
    setCopying(true);
    try { await copyMutation({ year, month }); }
    finally { setCopying(false); }
  };

  if (budgets === undefined) {
    return <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={copying}
            style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            {t("copyPreviousMonth")}
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("addBudget")}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      {budgets.length > 0 && (
        <div
          className="flex flex-wrap gap-6 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: "var(--color-ft-surface)" }}
        >
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--color-ft-text-3)" }}>{t("totalPlanned")}</p>
            <p className="font-mono font-semibold" style={{ color: "var(--color-ft-text)" }}>
              {formatMoney(totalPlanned)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--color-ft-text-3)" }}>{t("actual")}</p>
            <p className="font-mono font-semibold" style={{ color: "var(--color-ft-bad)" }}>
              {formatMoney(totalActual)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--color-ft-text-3)" }}>{t("balance")}</p>
            <p
              className="font-mono font-semibold"
              style={{ color: totalBalance >= 0 ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}
            >
              {totalBalance >= 0 ? "+" : ""}{formatMoney(totalBalance)}
            </p>
          </div>
        </div>
      )}

      {/* Budget list */}
      {budgets.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-10 flex flex-col items-center gap-2"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>
            {t("nobudgets")}
          </p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--color-ft-text-3)" }}>
            {t("nobudgetsHint")}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
        >
          {budgets.map((b: Budget) => (
            <BudgetRow
              key={b._id}
              budget={b}
              year={year}
              month={month}
              budgetedCategoryIds={budgetedCategoryIds}
            />
          ))}
        </div>
      )}

      <BudgetFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        year={year}
        month={month}
        budgetedCategoryIds={budgetedCategoryIds}
      />
    </div>
  );
}
```

---

## ARCHIVOS MODIFICADOS

### `src/app/(dashboard)/budget/page.tsx`

```tsx
import { getTranslations } from "next-intl/server";
import { BudgetList } from "@/components/budget/BudgetList";

export default async function BudgetPage() {
  const t = await getTranslations("budget");
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
      <BudgetList />
    </div>
  );
}
```

### `messages/en.json` — sección "budget" actualizada

```json
"budget": {
  "title": "Budget",
  "subtitle": "Plan and track your monthly spending",
  "addBudget": "Add Budget",
  "editBudget": "Edit Budget",
  "planned": "Planned",
  "actual": "Actual",
  "remaining": "Remaining",
  "spent": "Spent",
  "over": "over budget",
  "of": "of",
  "nobudgets": "No budget set for this month",
  "nobudgetsHint": "Add categories to start planning your spending",
  "copyPreviousMonth": "Copy from last month",
  "selectCategory": "Select category",
  "totalPlanned": "Total Planned",
  "totalSpent": "Total Spent",
  "balance": "Balance"
}
```

### `messages/es.json` — sección "budget" actualizada

```json
"budget": {
  "title": "Presupuesto",
  "subtitle": "Planifica y controla tus gastos mensuales",
  "addBudget": "Agregar Presupuesto",
  "editBudget": "Editar Presupuesto",
  "planned": "Planificado",
  "actual": "Real",
  "remaining": "Restante",
  "spent": "Gastado",
  "over": "excedido",
  "of": "de",
  "nobudgets": "Sin presupuesto para este mes",
  "nobudgetsHint": "Agrega categorías para empezar a planificar tus gastos",
  "copyPreviousMonth": "Copiar del mes anterior",
  "selectCategory": "Selecciona una categoría",
  "totalPlanned": "Total Planificado",
  "totalSpent": "Total Gastado",
  "balance": "Balance"
}
```

---

## DECISIONES CLAVE

1. **`listWithActuals` usa `Promise.all` doble:** una para obtener budgets + transactions en paralelo, y otra para hacer el JOIN con categorías. El JOIN de categorías es N+1 pero con volumen bajo en Fase 1 es aceptable. El mapa `actualMap` evita N queries de transacciones (un solo `.collect()` por mes).

2. **month es 1-indexed (1=enero, 12=diciembre)** para coincidir con la presentación en UI. El `new Date(year, month - 1, 1)` convierte al 0-indexed que espera JavaScript.

3. **`copyFromPreviousMonth` es aditivo:** solo copia categorías que aún no tienen budget en el mes destino. No sobreescribe entradas existentes.

4. **Un budget por categoría por mes** — validado server-side con `.filter(q => q.eq(q.field("categoryId"), args.categoryId))` antes del insert.

5. **Colores de progreso:** verde < 80%, amarillo 80–100%, rojo ≥ 100%. Misma lógica que la barra de utilización en CreditCardCard.

6. **`selectCategory` usa `tc("filter")` como label** — reutiliza la clave `common.filter` ya existente. No ideal semánticamente, pendiente cambiar label por `t("selectCategory")` si se quiere más precisión.
