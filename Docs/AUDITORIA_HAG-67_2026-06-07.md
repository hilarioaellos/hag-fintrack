# Auditoría — HAG-67: Dashboard selector de período (2026-06-07)

## Resumen

Añade `MonthNav` al Dashboard para que Income, Expenses y CashFlow muestren datos del mes seleccionado en lugar de siempre el mes actual. NetWorth permanece fijo (saldo actual, no filtrado por período).

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/dashboard/WidgetGrid.tsx` | `MonthNav` import + state `period` + header con navegador |
| `src/components/dashboard/widgets/StatCard.tsx` | Prop opcional `note` para mostrar texto secundario bajo la barra |
| `messages/en.json` | Clave `dashboard.currentBalance` |
| `messages/es.json` | Clave `dashboard.currentBalance` |

---

## Cambios en WidgetGrid.tsx

**Antes:** período hardcodeado
```tsx
const now = new Date();
const stats = useQuery(api.fintrack.transactions.monthlyStats, {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  currencyCode: effectiveCurrency,
});
```

**Después:** período en estado local
```tsx
const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
const stats = useQuery(api.fintrack.transactions.monthlyStats, {
  year: period.year,
  month: period.month,
  currencyCode: effectiveCurrency,
});
```

Header: `MonthNav` a la izquierda, `CurrencySelector` a la derecha (flex justify-between).

## Cambios en StatCard.tsx

Prop `note?: string` — cuando se pasa, aparece como texto pequeño junto a la barra de color. Usado únicamente en el widget de NetWorth para indicar "saldo actual" y aclarar que no cambia con el navegador de mes.

## Sin cambios en backend

`monthlyStats` ya acepta `year` y `month`. No se tocó ningún archivo Convex.

---

## Comportamiento

- Navegador inicia en el mes actual
- Al cambiar mes: Income, Expenses y CashFlow se actualizan
- NetWorth: siempre muestra el saldo actual con nota "saldo actual" / "current balance"
- CurrencySelector sigue funcionando igual — filtra las 4 cards por moneda

---

## Riesgo

**Bajo.** Cambio puramente de presentación — sin mutaciones, sin cambios de schema. El único riesgo es que `monthlyStats` devuelva datos incorrectos, pero la query ya era usada y validada en QA.

---

## Verificación ejecutada

- typecheck OK
- lint OK
