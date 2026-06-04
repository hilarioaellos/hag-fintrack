# Auditoría Bloque 7 — Control de Deudas

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)  
**Linear:** HAG-39

---

## ARCHIVOS NUEVOS — BACKEND (HAG Partner)

### `convex/fintrack/debts.ts`

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
    balanceCents: v.number(),
    interestRateBps: v.number(),
    monthlyPaymentCents: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!args.name.trim()) throw new ConvexError("Name is required");
    if (!args.lender.trim()) throw new ConvexError("Lender is required");
    validatePositiveCents(args.balanceCents, "balanceCents");
    if (args.balanceCents === 0) throw new ConvexError("balanceCents must be greater than 0");
    if (!Number.isInteger(args.interestRateBps) || args.interestRateBps < 0 || args.interestRateBps > 100_000)
      throw new ConvexError("interestRateBps must be an integer between 0 and 100000 (0–1000% APR)");
    validatePositiveCents(args.monthlyPaymentCents, "monthlyPaymentCents");
    if (args.monthlyPaymentCents === 0) throw new ConvexError("monthlyPaymentCents must be greater than 0");
    return ctx.db.insert("fintrack_debts", { userId, ...args, isActive: true });
  },
});

export const update = mutation({
  args: {
    id: v.id("fintrack_debts"),
    name: v.optional(v.string()),
    lender: v.optional(v.string()),
    balanceCents: v.optional(v.number()),
    interestRateBps: v.optional(v.number()),
    monthlyPaymentCents: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx);
    const debt = await ctx.db.get(id);
    if (!debt || debt.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    if (fields.name !== undefined && !fields.name.trim())
      throw new ConvexError("Name is required");
    if (fields.lender !== undefined && !fields.lender.trim())
      throw new ConvexError("Lender is required");
    if (fields.balanceCents !== undefined) {
      validatePositiveCents(fields.balanceCents, "balanceCents");
      if (fields.balanceCents === 0) throw new ConvexError("balanceCents must be greater than 0");
    }
    if (fields.interestRateBps !== undefined &&
        (!Number.isInteger(fields.interestRateBps) || fields.interestRateBps < 0 || fields.interestRateBps > 100_000))
      throw new ConvexError("interestRateBps must be an integer between 0 and 100000");
    if (fields.monthlyPaymentCents !== undefined) {
      validatePositiveCents(fields.monthlyPaymentCents, "monthlyPaymentCents");
      if (fields.monthlyPaymentCents === 0) throw new ConvexError("monthlyPaymentCents must be greater than 0");
    }
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined)
    );
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

## ARCHIVOS NUEVOS — FRONTEND (hag-fintrack)

### `src/components/debts/DebtFormDialog.tsx`

- Campos: nombre, prestamista, tipo (solo en create), balance, APR (%), pago mensual
- APR se ingresa como porcentaje (ej. 22.99) y se convierte a bps con `Math.round(aprFloat * 100)`
- Validación client-side antes de enviar: nombre requerido, balance > 0, APR 0–1000%, pago > 0

### `src/components/debts/DebtCard.tsx`

- Muestra: nombre, prestamista, badge tipo (revolving=amarillo, installment=cyan), balance en rojo, APR en amarillo, pago mensual
- Menú hover: Edit → DebtFormDialog, Archive → `debts.archive`
- APR display: `(interestRateBps / 100).toFixed(2) + "%"`

### `src/components/debts/DebtsList.tsx`

- Summary: total deuda en rojo
- Grid de DebtCards
- Sección de estrategia de pago:
  - Toggle **Avalanche** (mayor APR primero) / **Snowball** (menor balance primero)
  - Lista ordenada con número de posición, nombre, balance y APR
  - El #1 tiene fondo cyan (próximo a pagar)
- Estrategia calculada client-side con `.sort()` — sin queries adicionales

### `src/app/(dashboard)/debts/page.tsx`

Reemplaza placeholder. Pasa a usar `DebtsList`.

---

## MENSAJES — CLAVES NUEVAS

```json
// EN: subtitle, editDebt, name, noDebts, noDebtsHint, totalDebt,
//     avalanche, avalancheDesc, snowball, snowballDesc, payoffOrder
// ES: mismas claves en español
```

---

## DECISIONES CLAVE

1. **APR en basis points (bps) en backend, porcentaje en UI**: el usuario escribe 22.99%, el frontend convierte a 2299 bps con `Math.round(aprFloat * 100)`. El display hace la inversa: `(bps / 100).toFixed(2) + "%"`. Sin pérdida de precisión para valores con hasta 2 decimales.

2. **Estrategia calculada client-side**: `debts.list` retorna todos los datos necesarios. El sort se hace en el componente. No hay query adicional, no hay backend para esto.

3. **Sin proyección de tiempo**: por decisión explícita del usuario. La sección de estrategia muestra solo el orden sugerido. Los meses estimados de pago son backlog.

4. **`interestRateBps` máximo 100_000** (= 1000% APR): límite conservador para cubrir préstamos predatorios o tarjetas de alto riesgo sin rechazar datos válidos.

5. **Archive en lugar de delete**: `isActive: false`. Los datos históricos de la deuda se conservan. Consistent con el patrón de `accounts.archive`.
