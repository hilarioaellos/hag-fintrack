# Auditoría — HAG-69: NetWorth histórico — line chart (2026-06-07)

## Resumen

Reemplaza el snapshot estático de Net Worth en Reports por un componente que muestra el saldo actual **más** un line chart de los últimos 12 meses.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `Landingpage-HAG-Partner/convex/fintrack/reports.ts` | Query `netWorthHistory`; fix signo credit en `netWorthSnapshot` |
| `Landingpage-HAG-Partner/convex/fintrack/accounts.ts` | `createWithCard`: negar `initialBalanceCents` para credit; `netWorthCents`: fix signo credit |
| `src/components/reports/NetWorthCard.tsx` | Snapshot + line chart (Recharts LineChart) |
| `src/convex-generated/` | Sync de tipos |

Backend sin cambios en schema.

---

## Backend — `reports.netWorthHistory`

### Algoritmo

```
netWorthAtEndOfM = Σ(initialBalanceCents de cuentas creadas antes de fin de M)
                 + Σ(amountCents de transacciones income/expense con date ≤ endTs)
```

**Por qué excluir transfers:**
- La transacción de transfer solo se registra en la cuenta origen (signed negative).
- La cuenta destino recibe `+amountCents` vía `applyBalanceDelta` directamente, sin transaction record.
- Para net worth total de la cartera, las transferencias entre cuentas de la misma moneda son internas y su efecto neto es 0. Incluirlas causaría double-counting negativo.

**Por qué usar `initialBalanceCents` + transacciones en lugar de `balanceCents` actual:**
- `balanceCents` es el balance en tiempo real.
- Para reconstruir el balance en un mes M pasado, se necesita saber cuánto ha cambiado desde M hasta hoy.
- `initialBalanceCents` + Σ(txs hasta fin de M) da el balance correcto al final de ese mes.

**Consideración de creación de cuenta:**
- `a._creationTime <= endTs`: cuentas creadas después del mes M no existían — su `initialBalanceCents` no se incluye.

### Args

| Arg | Tipo | Default |
|---|---|---|
| `currencyCode` | `string` | — |
| `lookbackMonths` | `number?` | 12 |

### Returns

```ts
Array<{ label: string; netWorthCents: number }>
// label: "Jun 25", "Jul 25", ... (en-US short month + 2-digit year)
// netWorthCents: signed (negativo si patrimonio neto negativo)
```

---

## Frontend — `NetWorthCard.tsx`

### Layout

1. **Snapshot row**: número grande (rojo/verde según signo) + cuenta de cuentas
2. **Line chart**: `LineChart` de Recharts, height=180px, último mes a la derecha

### Detalles del chart

| Elemento | Configuración |
|---|---|
| `Line` | `stroke: --color-ft-primary`, `strokeWidth: 2`, `dot: false` |
| `XAxis` | `interval: "preserveStartEnd"` — muestra primer y último label siempre |
| `YAxis` | `tickFormatter: formatMoneyCompact` — ej. "MX$1K", "US$-5K" |
| `Tooltip` | Componente custom `NetWorthTooltip` — muestra valor formateado con color (rojo/verde) |
| `ReferenceLine` | `y=0` con línea punteada — referencia visual de saldo 0 |
| `CartesianGrid` | Horizontal only (`vertical: false`) |

### Estado vacío

Si `history.length <= 1` (sin datos suficientes), muestra `t("noData")` en lugar del chart.

### Loading

Skeleton único de `h-52` mientras ambas queries (`netWorthSnapshot` + `netWorthHistory`) carguen.

---

---

## Fix [NO GO] — signo de cuentas credit

**Convención establecida:** `balanceCents < 0` = deuda. Expenses en credit reducen `balanceCents` (más negativo = más deuda), payments/income lo aumentan (menos negativo = menos deuda). La UI muestra `displayBalance = -balanceCents` → deuda aparece como positivo (rojo).

**Problema 1 (`createWithCard`):** `initialBalanceCents` del usuario (positivo: "$12,300 de deuda") se almacenaba tal cual, resultando en `balanceCents = +1230000`. Entonces transactions de expense reducían el valor en lugar de incrementarlo — dirección incorrecta. **Fix:** `initialCents = -Math.abs(args.initialBalanceCents)` → se almacena como `-1230000`.

**Problema 2 (`netWorthSnapshot`):** sumaba `acc.balanceCents` sin distinción de tipo. Para cuentas legacy con `balanceCents` positivo (creadas antes del fix), inflaba el net worth. **Fix:** `acc.type === "credit" ? -Math.abs(acc.balanceCents) : acc.balanceCents` — defensivo: funciona tanto si el valor es negativo (correcto) como positivo (legacy).

**Problema 3 (`netWorthHistory`):** mismo patrón en `initialSum`. **Fix:** misma expresión defensiva en `initialBalanceCents`. Además añadido filtro `tx.currencyCode === currency` en `relevantTxs` como guardia extra ante datos inconsistentes.

**Problema 4 (`YAxis`):** `Math.abs(v)` ocultaba el signo negativo en el eje. **Fix:** eliminado — se pasa `v` directo a `formatMoneyCompact`.

**Problema 5 (`accounts.netWorthCents`):** usaba `sum - a.balanceCents` para credit. Con la nueva convención (`balanceCents = -1230000` para deuda), esto hacía `sum - (-1230000) = sum + 1230000` — inflaba el net worth del Dashboard. **Fix:** misma expresión defensiva: `sum + (a.type === "credit" ? -Math.abs(a.balanceCents) : a.balanceCents)`.

---

## Convención de signo — resumen

| Query | Fórmula credit | Resultado |
|---|---|---|
| `accounts.netWorthCents` | `-Math.abs(a.balanceCents)` | Dashboard net worth ✓ |
| `reports.netWorthSnapshot` | `-Math.abs(acc.balanceCents)` | Número grande en Reports ✓ |
| `reports.netWorthHistory` initialSum | `-Math.abs(a.initialBalanceCents)` | Línea histórica ✓ |
| `accounts.createWithCard` | `initialCents = -Math.abs(...)` | Nuevas cuentas credit almacenan deuda como negativo ✓ |

`displayBalance = -account.balanceCents` en `AccountCard` funciona correctamente para cuentas nuevas (balanceCents negativo → displayBalance positivo = muestra deuda como número positivo rojo). Sin cuentas legacy en el sistema (datos borrados con `clearUserData`), no hay riesgo de UX inconsistente.

---

## Riesgo

**Bajo.**
- Sin cambios en schema ni en otros componentes.
- `netWorthHistory` computa en memoria sobre las transacciones del usuario — para app personal (< 5000 txs) es inmediato.
- Ambas queries (`snapshot` + `history`) usan `by_user` index — sin full scan.
- La query `netWorthSnapshot` no se eliminó — sigue usándose para el número grande del card.

---

## Verificación ejecutada

- frontend typecheck OK
- frontend lint OK (eslint NetWorthCard.tsx --max-warnings=0)
- backend tsc --noEmit OK
- `npx convex dev --once` OK — deployed to `focused-swan-416` (3 deploys total)
- sync-types OK
