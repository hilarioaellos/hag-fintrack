# Auditoría HAG-53 — Snowball compara balances de monedas distintas

**Fecha:** 2026-06-06  
**Issue:** HAG-53  
**Módulo:** Debts (frontend-only + backend cleanup)

---

## Problema

En `DebtsList.tsx:37`, la estrategia snowball ordena deudas por `a.balanceCents - b.balanceCents`. Cuando el usuario tiene deudas en distintas monedas (e.g. USD y MXN), esta comparación es inválida: 500 unidades de MXN ≠ 500 unidades de USD. El orden mostrado no refleja cuál es el saldo más pequeño en términos reales.

La estrategia avalanche (por TAE) no tiene este problema — la tasa de interés es adimensional y comparable entre monedas.

---

## Solución implementada

**Enfoque elegido: warning banner informativo** (no se deshabilita la función).

- Sin tasas de cambio en el sistema, no es posible hacer una comparación correcta entre monedas.
- Deshabilitar snowball completamente sería demasiado restrictivo — el usuario puede tener deudas en una sola moneda la mayoría del tiempo, o puede entender la limitación.
- Se muestra un banner de advertencia visible solo cuando: `currencies.size > 1 && strategy === "snowball"`.

---

## Archivos modificados

### `src/components/debts/DebtsList.tsx`
- Import `TriangleAlert` de lucide-react
- Warning banner antes de la lista ordenada, visible solo cuando hay múltiples monedas Y la estrategia es snowball
- Sin cambios en la lógica de ordenamiento (best-effort con raw amounts)

### `messages/en.json` + `messages/es.json`
- Nueva clave `debts.snowballMixedCurrencyWarning`

### `Landingpage-HAG-Partner/convex/fintrack/debts.ts` (cleanup)
- Eliminada función local `validateCurrencyCode` duplicada
- Ahora importa `validateCurrencyCode` desde `./_money` (helper compartido, misma lógica)
- Cambio cosmético — comportamiento idéntico

---

## Verificación

- [ ] Usuario con deudas en 1 sola moneda: warning no aparece en ninguna estrategia
- [ ] Usuario con deudas en 2+ monedas + avalanche: sin warning (APR es comparable)
- [ ] Usuario con deudas en 2+ monedas + snowball: warning visible en español/inglés
- [ ] El orden de la lista sigue funcionando (sort no se rompe)
- [ ] `npm run typecheck` sin errores
