# Auditoría v2 — HAG-61 · A1: Módulo Suscripciones
**Fecha:** 2026-06-05  
**Ronda:** 2 (correcciones post-[NO GO])  
**Estado:** Listo para auditoría — pendiente commit

---

## Cambios respecto a la ronda anterior

### Errores Mayores 1–4 — Validación de ownership en `create` y `update`
**Archivo:** `Landingpage-HAG-Partner/convex/fintrack/subscriptions.ts`

**Problema:** `accountId` y `categoryId` se almacenaban/actualizaban sin verificar que pertenecieran al usuario autenticado. Un cliente con un ID válido de otro usuario podría asociar recursos ajenos.

**`create` — después:**
```ts
// Validate accountId ownership
const account = await ctx.db.get(args.accountId);
if (!account || account.userId !== userId || !account.isActive)
  throw new ConvexError("Invalid or inaccessible account");

// Validate categoryId ownership if provided
if (args.categoryId !== undefined) {
  const category = await ctx.db.get(args.categoryId);
  if (!category || category.userId !== userId)
    throw new ConvexError("Invalid or inaccessible category");
}
```

**`update` — después:**
```ts
if (fields.accountId !== undefined) {
  const account = await ctx.db.get(fields.accountId);
  if (!account || account.userId !== userId || !account.isActive)
    throw new ConvexError("Invalid or inaccessible account");
  patch.accountId = fields.accountId;
}
if (fields.categoryId !== undefined) {
  if (fields.categoryId !== null) {
    const category = await ctx.db.get(fields.categoryId);
    if (!category || category.userId !== userId)
      throw new ConvexError("Invalid or inaccessible category");
  }
  patch.categoryId = fields.categoryId ?? undefined;
}
```

Cobertura de los 4 casos reportados:
| # | Mutación | Campo | Fix |
|---|---|---|---|
| E1 | `create` | `accountId` | ✅ get + userId check + isActive |
| E2 | `create` | `categoryId` | ✅ get + userId check (si definido) |
| E3 | `update` | `accountId` | ✅ get + userId check + isActive |
| E4 | `update` | `categoryId` | ✅ get + userId check (si !== null) |

---

## Checklist de auditoría (ronda 2)

### Ownership — create
- [ ] `create` con `accountId` de otro usuario → error "Invalid or inaccessible account"
- [ ] `create` con cuenta inactiva del propio usuario → error "Invalid or inaccessible account"
- [ ] `create` con `categoryId` de otro usuario → error "Invalid or inaccessible category"
- [ ] `create` sin `categoryId` (undefined) → no se valida categoría, pasa sin error

### Ownership — update
- [ ] `update({ id, accountId: <ajeno> })` → error "Invalid or inaccessible account"
- [ ] `update({ id, accountId: <inactivo_propio> })` → error "Invalid or inaccessible account"
- [ ] `update({ id, categoryId: <ajena> })` → error "Invalid or inaccessible category"
- [ ] `update({ id, categoryId: null })` → elimina el campo, no valida (correcto — es un clear)
- [ ] `update({ id, categoryId: <propia_válida> })` → actualiza sin error

### Funcionalidad general (sin cambios respecto a v1)
- [ ] `renew` en cancelada → error
- [ ] `renew` monthly → avanza +1 mes
- [ ] Costo mensual equivalente: quarterly $30 → $10/mes
- [ ] Badge de renovación vencida → botón "Mark Renewed" visible

---

## Historial de correcciones HAG-61

| Ronda | Tipo | Fix |
|---|---|---|
| v1→v2 | Mayor (×4) | Validación ownership de accountId y categoryId en create y update |

---

## Pendiente antes de deployar

1. `npx convex dev` en `Landingpage-HAG-Partner` — publicar `subscriptions.ts`
2. Commit en `Landingpage-HAG-Partner` + commit en `hag-fintrack`

---

## Siguiente issue después de aprobar

**HAG-62 — A2: Presupuesto estimado desde histórico**
