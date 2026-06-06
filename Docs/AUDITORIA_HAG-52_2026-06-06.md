# Auditoría HAG-52 — Debts: errores de validación hardcodeados en inglés

**Fecha:** 2026-06-06  
**Issue:** HAG-52  
**Módulo:** Debts (frontend-only)

---

## Problema

`DebtFormDialog.tsx` tenía 9 mensajes de error de validación hardcodeados en inglés (líneas 96–116). Al usar la app en español, los errores se mostraban en inglés.

---

## Errores corregidos

| Código anterior | Clave i18n |
|---|---|
| `"Name is required"` | `debts.errorNameRequired` |
| `"Lender is required"` | `debts.errorLenderRequired` |
| `"Balance must be greater than 0"` | `debts.errorBalanceRequired` |
| `"APR must be between 0% and 1000%"` | `debts.errorAprRange` |
| `"Monthly payment must be greater than 0"` | `debts.errorMonthlyRequired` |
| `"Payment due day must be a whole number between 1 and 31"` | `debts.errorPaymentDueDayRange` |
| `"Total term must be a whole number of at least 1"` | `debts.errorTotalTermMin` |
| `"Paid installments must be a whole non-negative number"` | `debts.errorPaidInstallmentsNonNegative` |
| `"Paid installments cannot exceed total term"` | `debts.errorPaidExceedsTerm` |

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/debts/DebtFormDialog.tsx` | 9 `setError("...")` → `setError(t("errorKey"))` |
| `messages/en.json` | + 9 claves bajo `debts` |
| `messages/es.json` | + 9 claves bajo `debts` en español |

---

## Verificación

- [ ] Al enviar formulario vacío en ES: errores en español
- [ ] Balance = 0 en ES: "El saldo debe ser mayor a 0"
- [ ] APR fuera de rango en ES: "La TAE debe estar entre 0% y 1000%"
- [ ] Cuotas pagadas > plazo total en ES: "Las cuotas pagadas no pueden exceder el plazo total"
- [ ] Mismo formulario en EN: errores en inglés
- [ ] `npm run typecheck` sin errores
- [ ] `npm run lint` sin errores
