# Auditoría HAG-51 — Reports: tooltips y ejes hardcodean `$` y texto en inglés

**Fecha:** 2026-06-06  
**Issue:** HAG-51  
**Módulo:** Reports (frontend-only)

---

## Problema

Los tres charts de reportes usaban literales `$` hardcodeados para formatear montos en ejes Y y tooltips de Recharts:

| Archivo | Lugar | Código anterior |
|---|---|---|
| `IncomeExpensesChart` | función `formatK` (eje Y) | `` `$${(dollars / 1000).toFixed(1)}k` `` |
| `IncomeExpensesChart` | tooltip `formatter` | `` `$${(value / 100).toFixed(2)}` `` |
| `CategoryPieChart` | tooltip `formatter` | `` [`$${(value / 100).toFixed(2)}`] `` |
| `CashFlowChart` | `tickFormatter` (eje Y) | `` `$${(v / 100).toFixed(0)}` `` |
| `CashFlowChart` | tooltip `formatter` | `` `$${(value / 100).toFixed(2)}` `` |
| `CashFlowChart` | `labelFormatter` | `` `Day ${label}` `` |

Al seleccionar MXN en el selector de moneda (HAG-64), los ejes y tooltips seguían mostrando `$` en lugar de `MX$`, `€`, etc.

---

## Solución implementada

### `src/lib/money.ts`
Nueva función `formatMoneyCompact(cents, currency)`:
- Usa `Intl.NumberFormat` con `notation: "compact"` para etiquetas de eje (e.g. `MX$1K`, `$5.5K`)
- Try-catch igual que `formatMoney` — nunca lanza en render

### Charts corregidos
- **Tooltips** → `formatMoney(value, currencyCode)` (símbolo correcto, 2 decimales)
- **Eje Y** → `formatMoneyCompact(v, currencyCode)` (símbolo correcto, compacto)
- **`"Day {label}"`** → `t("day", { day: label })` con claves i18n en en/es

### `messages/en.json` + `messages/es.json`
Nueva clave `reports.day`:
- EN: `"Day {day}"`
- ES: `"Día {day}"`

### Ajuste de ancho de eje Y
`width` de 40/44 → 56 en ambos charts con YAxis, para que símbolos más largos (como `MX$`) no queden cortados.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/money.ts` | + `formatMoneyCompact` |
| `src/components/reports/IncomeExpensesChart.tsx` | Elimina `formatK`, usa `formatMoneyCompact` + `formatMoney` |
| `src/components/reports/CategoryPieChart.tsx` | Tooltip usa `formatMoney` |
| `src/components/reports/CashFlowChart.tsx` | Eje Y + tooltip usan `formatMoneyCompact`/`formatMoney`; `labelFormatter` usa i18n |
| `messages/en.json` | + `reports.day` |
| `messages/es.json` | + `reports.day` |

---

## Verificación

- [ ] Con moneda USD: eje Y muestra `$1K`, tooltip muestra `$1,234.56`
- [ ] Con moneda MXN: eje Y muestra `MX$1K`, tooltip muestra `MX$1,234.56`
- [ ] Con moneda EUR: eje Y muestra `€1K`, tooltip muestra `€1,234.56`
- [ ] CashFlow tooltip header dice "Day 15" en EN y "Día 15" en ES
- [ ] `npm run typecheck` sin errores
- [ ] `npm run lint` sin errores
