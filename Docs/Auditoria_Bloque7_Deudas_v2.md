# Auditoría Bloque 7 v2 — Control de Deudas (fixes aplicados)

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)  
**Linear:** HAG-39

---

## CAMBIOS RESPECTO A v1

| Finding | Severidad | Fix |
|---------|-----------|-----|
| Deudas sin `currencyCode` | Alta | Campo `currencyCode: v.string()` agregado a schema + `debts.ts` + `DebtFormDialog` + `formatMoney` en `DebtCard` y `DebtsList` |
| Backend guarda strings sin trim | Media-baja | `create` inserta payload normalizado explícitamente; `update` construye `patch` con `.trim()` y `.toUpperCase()` |
| i18n incompleto | Baja | `t("archive")`, `t("debtType")`, `t("currency")` reemplazados; error messages → HAG-52 backlog |

---

## SCHEMA — `convex/schema.ts`

```ts
fintrack_debts: defineTable({
  userId: v.id("users"),
  name: v.string(),
  lender: v.string(),
  type: v.union(v.literal("revolving"), v.literal("installment")),
  currencyCode: v.string(),        // ← nuevo
  balanceCents: v.number(),
  interestRateBps: v.number(),
  monthlyPaymentCents: v.number(),
  isActive: v.boolean(),
}).index("by_user", ["userId"]),
```

---

## BACKEND — `convex/fintrack/debts.ts` (completo)

```ts
import { ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./_auth";
import { validatePositiveCents } from "./_money";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query("fintrack_debts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    lender: v.string(),
    type: v.union(v.literal("revolving"), v.literal("installment")),
    currencyCode: v.string(),
    balanceCents: v.number(),
    interestRateBps: v.number(),
    monthlyPaymentCents: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    const lender = args.lender.trim();
    const currencyCode = args.currencyCode.toUpperCase().trim();
    if (!name) throw new ConvexError("Name is required");
    if (!lender) throw new ConvexError("Lender is required");
    if (!currencyCode) throw new ConvexError("Currency is required");
    validatePositiveCents(args.balanceCents, "balanceCents");
    if (args.balanceCents === 0) throw new ConvexError("balanceCents must be greater than 0");
    if (!Number.isInteger(args.interestRateBps) || args.interestRateBps < 0 || args.interestRateBps > 100_000)
      throw new ConvexError("interestRateBps must be an integer between 0 and 100000 (0–1000% APR)");
    validatePositiveCents(args.monthlyPaymentCents, "monthlyPaymentCents");
    if (args.monthlyPaymentCents === 0) throw new ConvexError("monthlyPaymentCents must be greater than 0");
    return ctx.db.insert("fintrack_debts", {
      userId, name, lender, type: args.type, currencyCode,
      balanceCents: args.balanceCents,
      interestRateBps: args.interestRateBps,
      monthlyPaymentCents: args.monthlyPaymentCents,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("fintrack_debts"),
    name: v.optional(v.string()),
    lender: v.optional(v.string()),
    currencyCode: v.optional(v.string()),
    balanceCents: v.optional(v.number()),
    interestRateBps: v.optional(v.number()),
    monthlyPaymentCents: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx);
    const debt = await ctx.db.get(id);
    if (!debt || debt.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    const patch: Record<string, unknown> = {};
    if (fields.name !== undefined) {
      const name = fields.name.trim();
      if (!name) throw new ConvexError("Name is required");
      patch.name = name;
    }
    if (fields.lender !== undefined) {
      const lender = fields.lender.trim();
      if (!lender) throw new ConvexError("Lender is required");
      patch.lender = lender;
    }
    if (fields.currencyCode !== undefined) {
      const currencyCode = fields.currencyCode.toUpperCase().trim();
      if (!currencyCode) throw new ConvexError("Currency is required");
      patch.currencyCode = currencyCode;
    }
    if (fields.balanceCents !== undefined) {
      validatePositiveCents(fields.balanceCents, "balanceCents");
      if (fields.balanceCents === 0) throw new ConvexError("balanceCents must be greater than 0");
      patch.balanceCents = fields.balanceCents;
    }
    if (fields.interestRateBps !== undefined) {
      if (!Number.isInteger(fields.interestRateBps) || fields.interestRateBps < 0 || fields.interestRateBps > 100_000)
        throw new ConvexError("interestRateBps must be an integer between 0 and 100000");
      patch.interestRateBps = fields.interestRateBps;
    }
    if (fields.monthlyPaymentCents !== undefined) {
      validatePositiveCents(fields.monthlyPaymentCents, "monthlyPaymentCents");
      if (fields.monthlyPaymentCents === 0) throw new ConvexError("monthlyPaymentCents must be greater than 0");
      patch.monthlyPaymentCents = fields.monthlyPaymentCents;
    }
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
  },
});

export const archive = mutation({
  args: { id: v.id("fintrack_debts") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const debt = await ctx.db.get(id);
    if (!debt || debt.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    await ctx.db.patch(id, { isActive: false });
  },
});
```

---

## FRONTEND — CAMBIOS RELEVANTES

**`DebtFormDialog.tsx`**: nuevo campo `currency` (Input uppercase, default "USD"); enviado en `create` y `update`.

**`DebtCard.tsx`**: `formatMoney(debt.balanceCents, debt.currencyCode)` y `formatMoney(debt.monthlyPaymentCents, debt.currencyCode)`. `t("archive")` reemplaza "Archive".

**`DebtsList.tsx`**: total calculado solo si todas las deudas tienen la misma moneda. Si hay monedas mixtas, el total se oculta.

```ts
const currencies = new Set(debts.map((d: Debt) => d.currencyCode));
const singleCurrency = currencies.size === 1 ? debts[0].currencyCode : null;
const totalDebt = singleCurrency
  ? debts.reduce((s: number, d: Debt) => s + d.balanceCents, 0)
  : null;
```

---

## BACKLOG CREADO

| Issue | Descripción |
|-------|-------------|
| **HAG-52** | Debts: mensajes de error de validación hardcodeados en inglés |

---

## DECISIONES CLAVE

1. **`currencyCode.toUpperCase().trim()` en backend**: normalización garantizada server-side independientemente de lo que envíe el cliente.

2. **Total visible solo en moneda única**: si el usuario tiene deudas en USD y EUR, el total se oculta en lugar de sumar incorrectamente. Consistente con la filosofía del bloque de reportes.

3. **Patch construido explícitamente** en `update`: en lugar de `Object.fromEntries(Object.entries(fields)...)`, se construye `patch` campo por campo. Esto permite aplicar la normalización (`.trim()`, `.toUpperCase()`) antes de guardar, sin asumir que el valor de `fields` ya está limpio.
