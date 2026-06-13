# Auditoría — HAG-73 · Fix Timezone: Fechas Off-by-One y Category Breakdown vs Drill-Down
**Fecha:** 2026-06-11  
**Estado:** Listo para GO — pendiente commit, push y Linear

---

## Motivación

Dos bugs reportados al revisar transacciones de mayo 2026:

1. **Fechas incorrectas en el form de edición** — Zelles de Iris del 31 de mayo aparecían como `06-01-2026` al abrir el form de edición, aunque en la lista de transacciones se mostraban correctamente como `May 31`.

2. **Category breakdown ≠ drill-down** — La categoría Iris mostraba $3,300 en el breakdown de mayo, pero al hacer click aparecían 3 transacciones que sumaban $5,500.

Causa raíz: inconsistencia en el manejo de timezones. El servidor Convex corre en UTC; el browser de un usuario en EDT (UTC-4) tiene una diferencia que desplaza las fechas al cruzar la medianoche.

---

## Causa raíz detallada

### Bug 1 — Forms mostraban fecha UTC en lugar de fecha local

`new Date(tx.date).toISOString().slice(0, 10)` convierte el timestamp a UTC antes de extraer la fecha. Una transacción guardada a las `June 1 00:00:00 UTC` equivale a `May 31 20:00 EDT`. La lista usaba date-fns `format()` (hora local → correcto), pero los forms usaban `toISOString()` (UTC → incorrecto).

### Bug 2 — Forms guardaban date-only strings como UTC midnight

`new Date("2026-05-31").getTime()` en JavaScript interpreta strings date-only como medianoche UTC, no hora local. Para usuarios en US (UTC-4 a -8), eso produce un timestamp que en hora local es el día anterior (8pm del 30 de mayo), causando datos incorrectos en nuevas entradas y ediciones.

### Bug 3 — CategoryDrillDown usaba límites de mes en hora local

```
// Antes (hora local del browser):
const startMs = new Date(year, month - 1, 1).getTime();
const endMs = new Date(year, month, 1).getTime() - 1;
```

Con un usuario en EDT (UTC-4), el `endMs` de mayo era `June 1 03:59:59 UTC`. El backend `expensesByCategory` corre en Convex (UTC), así que su límite era `June 1 00:00:00 UTC`. Transacciones entre esos dos valores aparecían en el drill-down pero no en el total.

### Bug 4 — CategoryDrillDown no filtraba por `txType`

Para categorías normales (no `__none__`), el filtro solo verificaba `categoryId` y `currencyCode`, pero no `type`. Si una categoría tenía income y expense, el drill-down mostraba ambos mientras que el breakdown solo sumaba uno.

### Bug 5 — CSV import guardaba fechas a medianoche UTC

`parseDateSafe()` usaba `new Date(y, m-1, d)` que en el servidor Convex (UTC) produce medianoche UTC. Para usuarios en US (UTC-5), eso equivale a las 7pm del día anterior en hora local.

---

## Solución

### Helper centralizado — `src/lib/dates.ts` (nuevo)

```typescript
// Timestamp → string local para <input type="date">
export function toLocalDateInput(ts: number): string { ... }

// String de input → timestamp a mediodía local (evita UTC midnight)
export function dateInputToTimestamp(date: string): number {
  return new Date(date + "T12:00:00").getTime();
}

// Variante opcional para campos no requeridos
export function toLocalDateInputOpt(ts?: number): string { ... }
```

Todos los forms usan estos dos helpers. El `T12:00:00` garantiza que JavaScript interprete el string como hora local (no UTC), y el mediodía preserva el día correcto en todos los timezones US (UTC-4 a -8).

---

## Archivos modificados

### `hag-fintrack`

| Archivo | Cambio |
|---|---|
| `src/lib/dates.ts` | **Nuevo** — helpers `toLocalDateInput`, `toLocalDateInputOpt`, `dateInputToTimestamp` |
| `src/components/transactions/TransactionFormDialog.tsx` | Display + escritura usan helpers; elimina función inline `toLocalISO` |
| `src/components/reconciliation/ReconcileForm.tsx` | Display + escritura usan helpers |
| `src/components/receivables/PaymentFormDialog.tsx` | Display + escritura usan helpers |
| `src/components/receivables/ReceivableFormDialog.tsx` | Display + escritura (2 campos) usan helpers |
| `src/components/subscriptions/SubscriptionFormDialog.tsx` | Display + escritura usan helpers |
| `src/components/debts/DebtFormDialog.tsx` | Display + escritura usan helpers |
| `src/components/reports/CategoryDrillDown.tsx` | Límites UTC con `Date.UTC()`; agrega `tx.type === txType` al filtro |
| `src/components/transactions/TransactionsList.tsx` | Agrega `filterCategoryId` a deps de `useMemo` (warning preexistente) |

### `Landingpage-HAG-Partner` — commit `88a7007` (ya committed)

| Archivo | Cambio |
|---|---|
| `convex/fintrack/import.ts` | `parseDateSafe`: usa `Date.UTC(y, m-1, d, 12, 0, 0)` (mediodía UTC); validación con `getUTC*`; incluye `categoryId` en pipeline |

---

## Tabla de escenarios

| Escenario | Antes | Después |
|---|---|---|
| Editar tx de May 31 (usuario EDT) | Form muestra Jun 1 ❌ | Form muestra May 31 ✓ |
| Guardar fecha May 31 en cualquier form | Guardada como May 30 23:xx UTC ❌ | Guardada como May 31 16:00 UTC ✓ |
| Breakdown mayo vs drill-down | Discrepan ❌ | Coinciden ✓ |
| `txType` en drill-down | Mezcla income + expense ❌ | Solo el tipo correcto ✓ |
| CSV import fecha May 31 | Guardada a medianoche UTC (problemática) ❌ | Guardada a mediodía UTC ✓ |

---

## Validaciones

- `npm run typecheck` → **0 errores**
- `npm run lint` → **0 errores, 0 warnings**

---

## Nota sobre datos existentes

Las transacciones **ya importadas via CSV** con medianoche UTC pueden seguir mostrando la fecha incorrecta. Para corregirlas: abrir el form de edición → verificar la fecha local → guardar. Al guardar, el nuevo timestamp se almacena correctamente a mediodía UTC.

---

## Puntos a verificar durante la auditoría

### Forms de transacciones
- [ ] Abrir transacción de May 31 → form muestra May 31 (no Jun 1)
- [ ] Crear transacción a las 11pm → date default = fecha local (no UTC del día siguiente)
- [ ] Editar y guardar → fecha no cambia inesperadamente; reabre con la misma fecha

### Otros forms (receivables, subscriptions, debts, reconciliation)
- [ ] Crear/editar con fecha 2026-05-31 en zona America/New_York → guarda y reabre como 2026-05-31

### Category Breakdown + Drill-Down
- [ ] Totales del breakdown coinciden con la suma del drill-down
- [ ] Drill-down expense no muestra transacciones income de la misma categoría
- [ ] Drill-down income no muestra transacciones expense

### CSV Import (futuras importaciones)
- [ ] Fechas de fin de mes se guardan y muestran correctamente

### Sin regresión
- [ ] `npm run typecheck` → 0 errores
- [ ] `npm run lint` → 0 errores, 0 warnings

---

## Pendiente antes de deployar

1. Commit en `hag-fintrack` (este cambio — `src/lib/dates.ts` + 8 componentes)
2. Push `hag-fintrack` master → `origin/master`
3. Push `Landingpage-HAG-Partner` master → `origin/master` + `npx convex deploy`
4. Ticket HAG-73 en Linear → marcar Done ✅
