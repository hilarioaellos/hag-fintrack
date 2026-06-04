# Auditoría Bloque 9 v2 — Conciliación Bancaria (fixes aplicados)

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)  
**Linear:** HAG-41

---

## CAMBIOS RESPECTO A v1

| Finding | Severidad | Fix |
|---------|-----------|-----|
| `bankBalanceCents` no usa validateCents | Media-alta | Importar `validateCents` de `_money.ts` y usarlo en `create` |
| Permite conciliar cuentas archivadas | Media | Validar `!account.isActive` en `listByAccount` y `create` |
| Historial ordena por creación, no por fecha | Media | Agregar índice `by_account_date: ["accountId", "date"]` al schema; usarlo en `listByAccount` |
| i18n incompleto | Baja | → HAG-54 backlog |

---

## SCHEMA — `convex/schema.ts`

**Cambio:** Agregar índice `by_account_date`

```ts
fintrack_reconciliations: defineTable({
  userId: v.id("users"),
  accountId: v.id("fintrack_accounts"),
  date: v.number(),
  systemBalanceCents: v.number(),
  bankBalanceCents: v.number(),
  differenceCents: v.number(),
  status: v.union(v.literal("pending"), v.literal("completed"), v.literal("discrepancy")),
  notes: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_account", ["accountId"])
  .index("by_account_date", ["accountId", "date"]),  // ← nuevo
```

---

## BACKEND — `convex/fintrack/reconciliations.ts` (actualizado)

```ts
import { ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./_auth";
import { validateCents } from "./_money";  // ← nuevo

export const listByAccount = query({
  args: { accountId: v.id("fintrack_accounts") },
  handler: async (ctx, { accountId }) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(accountId);
    if (!account || account.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    if (!account.isActive)  // ← nuevo
      throw new ConvexError({ code: 403, message: "Account is archived" });
    return ctx.db
      .query("fintrack_reconciliations")
      .withIndex("by_account_date", (q) => q.eq("accountId", accountId))  // ← cambiado
      .order("desc")
      .take(20);
  },
});

export const create = mutation({
  args: {
    accountId: v.id("fintrack_accounts"),
    bankBalanceCents: v.number(),
    date: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, bankBalanceCents, date, notes }) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(accountId);
    if (!account || account.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    if (!account.isActive)  // ← nuevo
      throw new ConvexError({ code: 403, message: "Account is archived" });
    validateCents(bankBalanceCents, "bankBalanceCents");  // ← cambiado
    if (!Number.isFinite(date) || date <= 0)
      throw new ConvexError("date must be a valid timestamp");

    const systemBalanceCents = account.balanceCents;
    const differenceCents = bankBalanceCents - systemBalanceCents;
    const status = differenceCents === 0 ? "completed" : "discrepancy";

    return ctx.db.insert("fintrack_reconciliations", {
      userId,
      accountId,
      date,
      systemBalanceCents,
      bankBalanceCents,
      differenceCents,
      status,
      notes: notes?.trim() || undefined,
    });
  },
});
```

---

## FRONTEND — SIN CAMBIOS

Componentes (`ReconcileForm`, `ReconciliationHistory`, `ReconciliationList`) son idénticos a v1. Los fixes de i18n fueron diferidos a backlog.

---

## BACKLOG CREADO

| Issue | Descripción |
|-------|-------------|
| **HAG-54** | Reconciliation: i18n incompleto, textos hardcodeados en inglés |

---

## DECISIONES CLAVE

1. **`validateCents` desde `_money.ts`**: misma función que valida límites de centavos en todo el módulo financiero. Rechaza montos fuera de rango para evitar overflow.

2. **Validar `account.isActive`**: bloquea operaciones en cuentas archivadas. Consistency con el patrón usado en otros módulos.

3. **Índice `by_account_date`**: permite que `.order("desc")` ordene por fecha de statement, no por creación. Si el usuario registra un statement antiguo después, aparecerá en la posición temporal correcta del historial.

4. **Sin cambios en frontend**: i18n se aborda en HAG-54 (backlog bajo).
