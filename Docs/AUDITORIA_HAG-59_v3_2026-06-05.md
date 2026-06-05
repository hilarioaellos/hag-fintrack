# Auditoría v3 — HAG-59 · A7: Enriquecer módulo Deudas y reactivar
**Fecha:** 2026-06-05  
**Ronda:** 3 (correcciones post-[NO GO] v2)  
**Estado:** Listo para auditoría — pendiente commit

---

## Cambios respecto a la ronda anterior

### Error Mayor — cross-check incompleto en `update`
**Archivo:** `Landingpage-HAG-Partner/convex/fintrack/debts.ts`

**Problema:** Si un `update` enviaba solo `totalTermMonths` (sin `paidInstallments`), el cross-check usaba `fields.paidInstallments = undefined` y no detectaba que el valor ya persistido en BD podría ser mayor que el nuevo plazo.

**Antes:**
```ts
validateA7Fields({
  paymentDueDate: fields.paymentDueDate,
  totalTermMonths: fields.totalTermMonths ?? debt.totalTermMonths,
  paidInstallments: fields.paidInstallments,  // ← siempre undefined si no se envió
});
```

**Después:**
```ts
const effectiveTotalTermMonths = fields.totalTermMonths ?? debt.totalTermMonths;
const effectivePaidInstallments = fields.paidInstallments ?? debt.paidInstallments;
validateA7Fields({
  paymentDueDate: fields.paymentDueDate,
  totalTermMonths: effectiveTotalTermMonths,
  paidInstallments: effectivePaidInstallments,
});
```

Ahora el cross-check usa ambos valores efectivos, cubriendo los casos:
- Solo cambia `totalTermMonths` → valida contra `paidInstallments` existente en BD
- Solo cambia `paidInstallments` → valida contra `totalTermMonths` existente en BD
- Cambian ambos → valida los dos entrantes entre sí

---

### Sugerencia Menor — `value=""` → sentinel `"none"` en Select de periodicidad
**Archivo:** `src/components/debts/DebtFormDialog.tsx`

Radix UI `Select` puede tener comportamiento indefinido con `value=""`. Cambio a sentinel explícito:

- Estado: `useState<Periodicity | "none">(...)` inicializa en `"none"`
- `reset()` también usa `"none"`
- `<SelectItem value="none">—</SelectItem>` como primera opción
- Al construir `a7`: `periodicity !== "none" ? periodicity : undefined`

---

## Checklist de auditoría (ronda 3)

### Backend — `debts.ts` · `update`
- [ ] `update({ id, totalTermMonths: 5 })` cuando `debt.paidInstallments = 8` → error "paidInstallments cannot exceed totalTermMonths"
- [ ] `update({ id, paidInstallments: 20 })` cuando `debt.totalTermMonths = 12` → error "paidInstallments cannot exceed totalTermMonths"
- [ ] `update({ id, totalTermMonths: 15, paidInstallments: 10 })` cuando BD tiene `paidInstallments = 8` → OK
- [ ] `update({ id, totalTermMonths: 15 })` cuando BD tiene `paidInstallments = undefined` → OK (no cross-check necesario)

### Frontend — Select periodicidad
- [ ] El Select muestra "—" por defecto en deudas nuevas
- [ ] Seleccionar "—" y guardar → `paymentPeriodicity` no se envía al backend (`undefined`)
- [ ] Editar deuda con `paymentPeriodicity: "monthly"` → Select preselecciona "Mensual"
- [ ] Editar deuda sin `paymentPeriodicity` → Select muestra "—"
- [ ] No hay error de consola relacionado con `value=""` en Radix Select

---

## Historial de correcciones HAG-59

| Ronda | Tipo | Fix |
|---|---|---|
| v1→v2 | Mayor | `parseInt` → `Number`+`isInteger`+`isNaN` en DebtFormDialog |
| v1→v2 | Mayor | Guard "pago insuficiente" en `buildSchedule` |
| v1→v2 | Mayor | `totalTermMonths` usado como `maxMonths` en `buildSchedule` |
| v1→v2 | Menor | `periodicity` default `""`, no persiste si no se elige |
| v1→v2 | Menor | Campos installment-only no se envían en revolving |
| v2→v3 | Mayor | Cross-check `update` usa valores efectivos (BD + entrante) |
| v2→v3 | Menor | Sentinel `"none"` reemplaza `value=""` en Radix Select |

---

## Pendiente antes de deployar

1. `npx convex dev` en `Landingpage-HAG-Partner` — mutations `create`/`update` con campos A7 y cross-check corregido
2. Verificar en Convex dashboard que `fintrack_debts` acepta los nuevos campos opcionales
3. Commit en `Landingpage-HAG-Partner` + commit en `hag-fintrack`

---

## Siguiente issue después de aprobar

**HAG-60 — A6: Módulo Acreencias** (schema `fintrack_receivables` ya existe desde HAG-58)
