# Auditoría HAG-54 — Reconciliation: i18n incompleto

**Fecha:** 2026-06-06  
**Issue:** HAG-54  
**Módulo:** Reconciliation (frontend-only)

---

## Problema

El módulo de conciliación tenía 6 strings hardcodeados en inglés:

| Archivo | String | Contexto |
|---|---|---|
| `ReconcileForm.tsx:51` | `"Enter the bank balance"` | Error de validación |
| `ReconcileForm.tsx:53` | `"Invalid date"` | Error de validación |
| `ReconcileForm.tsx:83` | `"New reconciliation"` | Botón de reset |
| `ReconcileForm.tsx:152` | `(optional)` | Label del campo notas |
| `ReconciliationHistory.tsx:57` | `format(r.date, "MMM d, yyyy")` | Fecha formateada en inglés siempre |
| `ReconciliationHistory.tsx:68` | `"Bank: "` | Label de saldo bancario |

---

## Solución implementada

### `messages/en.json` + `messages/es.json`
5 nuevas claves bajo `reconciliation`:
- `newReconciliation`, `optional`, `bankLabel`
- `errorBankBalanceRequired`, `errorInvalidDate`

### `ReconcileForm.tsx`
- 2 `setError(...)` → `setError(t("errorXxx"))`
- Botón "New reconciliation" → `{t("newReconciliation")}`
- `(optional)` → `{t("optional")}`

### `ReconciliationHistory.tsx`
- Eliminado import `date-fns/format` — el módulo solo lo usaba para esta línea
- `format(new Date(r.date), "MMM d, yyyy")` → `new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(...)`
- `useLocale()` añadido para obtener el locale activo
- `"Bank: "` → `{t("bankLabel")}:`

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/reconciliation/ReconcileForm.tsx` | 4 strings → t(...) |
| `src/components/reconciliation/ReconciliationHistory.tsx` | date-fns → Intl.DateTimeFormat + bankLabel i18n; import date-fns eliminado |
| `messages/en.json` | + 5 claves bajo `reconciliation` |
| `messages/es.json` | + 5 claves bajo `reconciliation` |

---

## Verificación

- [ ] En ES: errores de validación en español
- [ ] En ES: botón "Nueva conciliación" visible tras confirmar
- [ ] En ES: label notas muestra "(opcional)"
- [ ] En ES: fechas en historial muestran "jun. 6, 2026" (formato es-ES)
- [ ] En ES: label "Banco: $1,234.00" en historial
- [ ] `npm run typecheck` sin errores
- [ ] `npm run lint` sin errores
