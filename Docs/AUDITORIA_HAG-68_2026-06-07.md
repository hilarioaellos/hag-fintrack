# Auditoría — HAG-68: Reports Category Drill-down (2026-06-07)

## Resumen

Al hacer click en un slice del pie chart o en un ítem de la leyenda, aparece un panel debajo del gráfico con las transacciones de esa categoría en el mes activo.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/reports/CategoryPieChart.tsx` | Click handlers en Pie y legend, estado `selectedCat`, panel drill-down |

**Sin cambios en backend ni en mensajes i18n.** Los textos del panel reutilizan `reports.noData` ya existente.

---

## Lógica

**Selección:** `toggleCat(cat)` — si ya está seleccionada la misma categoría la deselecciona (toggle). Cambiar mes via MonthNav resetea la selección. Cambiar moneda (`currencyCode`) también resetea via `useEffect(() => setSelectedCat(null), [currencyCode])`.

**Queries (condicionales con `"skip"`):**
- `transactions.list` con `startDate`/`endDate` del mes — solo se ejecuta cuando hay `selectedCat`
- `accounts.list` — solo se ejecuta cuando hay `selectedCat`, para resolver nombre de cuenta

**Filtro client-side:**
```ts
drillTxs = monthTxs.filter(tx =>
  tx.categoryId === selectedCat.categoryId && tx.currencyCode === currencyCode
)
```
No requiere nueva query Convex — el dataset mensual de un usuario es pequeño.

**Feedback visual:**
- Slice/legend no seleccionada: `opacity: 0.35` / `0.45`
- Slice/legend seleccionada: opacidad normal + fondo sutil en legend

**Panel drill-down:**
- Header: dot de color + nombre + total de la categoría + botón X para cerrar
- Lista de transacciones: fecha corta, notas (o nombre de cuenta como fallback), cuenta, monto
- Scroll interno (`max-h-52 overflow-y-auto`) para listas largas
- Loading skeleton mientras carga `monthTxs`

---

## Riesgo

**Bajo.** Solo lectura — sin mutaciones. Las queries son condicionales y no se ejecutan hasta que el usuario hace click.

---

## Verificación ejecutada

- typecheck OK
- lint OK
