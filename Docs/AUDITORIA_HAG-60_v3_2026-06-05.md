# Auditoría v3 — HAG-60 · A6: Módulo Acreencias
**Fecha:** 2026-06-05  
**Ronda:** 3 (correcciones post-[NO GO] v2)  
**Estado:** Listo para auditoría — pendiente commit

---

## Cambio de esta ronda

### Error Mayor — payload `null` enviado a `create` para `interestRate`
**Archivo:** `src/components/receivables/ReceivableFormDialog.tsx`

**Problema:** El refactor anterior calculaba `interestRateBps` como `null` cuando el campo estaba vacío, y ese `null` se enviaba tanto en `update` (correcto: backend acepta `null` para limpiar) como en `create` (incorrecto: backend acepta `v.optional(v.number())`, no `null`).

**Antes:**
```ts
const interestRateBps = interestRateNum !== undefined
  ? Math.round(interestRateNum * 100)
  : null; // ← se enviaba en create también
```

**Después:** Un solo `interestRateBps` siempre `number | undefined`, y el payload de `update` construye el `null` inline al llamar la mutación:

```ts
const interestRateBps = interestRateNum !== undefined
  ? Math.round(interestRateNum * 100)
  : undefined;

// create:  interestRate: interestRateBps         (undefined = no enviar)
// update:  interestRate: interestRateBps !== undefined ? interestRateBps : null
//                                                (null = eliminar campo)
```

---

### Sugerencia Menor — `Number(amount)` en ambos formularios
**Archivos:** `ReceivableFormDialog.tsx`, `PaymentFormDialog.tsx`

`parseFloat("12abc")` → 12. `Number("12abc")` → NaN → cae en `!Number.isFinite` → error antes de `dollarsToCents`.

---

## Historial de correcciones HAG-60

| Ronda | Tipo | Fix |
|---|---|---|
| v1→v2 | Mayor | `update` acepta `null` para limpiar campos opcionales |
| v1→v2 | Mayor | `currencyCode` inmutable post-creación |
| v1→v2 | Menor | `Number.isFinite` en formularios de monto |
| v2→v3 | Mayor | Payloads separados para `create` (`undefined`) y `update` (`null`) en `interestRate` |
| v2→v3 | Menor | `Number(amount)` en lugar de `parseFloat` en ambos formularios |

---

## Checklist de auditoría (ronda 3)

### interestRate — los dos flujos
- [ ] **Create sin tasa** → `interestRate: undefined` (no se envía) → backend acepta sin error
- [ ] **Create con tasa 12.5%** → `interestRate: 1250` → backend guarda 1250 bps
- [ ] **Edit, borrar tasa** → `interestRate: null` → backend elimina el campo del documento
- [ ] **Edit, poner tasa 5%** → `interestRate: 500` → backend actualiza

### amount parsing
- [ ] `"12abc"` en monto → error "Amount must be greater than 0"
- [ ] `"Infinity"` en monto → error "Amount must be greater than 0"
- [ ] `"12.50"` → pasa a `dollarsToCents` correctamente (1250 cents)

---

## Pendiente antes de deployar

1. `npx convex dev` en `Landingpage-HAG-Partner` — publicar `receivables.ts`
2. Commit en `Landingpage-HAG-Partner` + commit en `hag-fintrack`

---

## Siguiente issue después de aprobar

**HAG-61 — A1: Módulo Suscripciones**
