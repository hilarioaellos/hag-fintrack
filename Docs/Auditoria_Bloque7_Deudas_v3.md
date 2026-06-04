# Auditoría Bloque 7 v3 — Control de Deudas (fix currencyCode validación)

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)  
**Linear:** HAG-39

---

## CAMBIO RESPECTO A v2

| Finding | Severidad | Fix |
|---------|-----------|-----|
| `currencyCode` normalizado pero no validado | Bloqueante | `validateCurrencyCode()` con regex `^[A-Z]{3}$` + `Intl.NumberFormat` probe en `create` y `update` |
| Snowball compara balances de monedas distintas | Baja | → HAG-53 backlog |

---

## FUNCIÓN AGREGADA — `convex/fintrack/debts.ts`

```ts
function validateCurrencyCode(code: string): string {
  const normalized = code.toUpperCase().trim();
  if (!/^[A-Z]{3}$/.test(normalized))
    throw new ConvexError("currencyCode must be a 3-letter ISO code (e.g. USD, EUR, MXN)");
  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency: normalized });
  } catch {
    throw new ConvexError(`currencyCode "${normalized}" is not a supported currency`);
  }
  return normalized;
}
```

**Uso en `create`:**
```ts
const currencyCode = validateCurrencyCode(args.currencyCode);
```

**Uso en `update`:**
```ts
if (fields.currencyCode !== undefined) {
  patch.currencyCode = validateCurrencyCode(fields.currencyCode);
}
```

---

## SIN CAMBIOS RESPECTO A v2

- Schema (`fintrack_debts` con `currencyCode: v.string()`)
- Frontend (`DebtFormDialog`, `DebtCard`, `DebtsList`)
- Mensajes

---

## BACKLOG

| Issue | Descripción |
|-------|-------------|
| **HAG-52** | Debts: mensajes de error de validación hardcodeados en inglés |
| **HAG-53** | Debts: orden Snowball compara balances de monedas distintas |

---

## DECISIÓN DE DISEÑO

`Intl.NumberFormat` como validador de moneda es la misma función que usa `formatMoney()` en producción. Si el código pasa el probe aquí, no puede lanzar `RangeError` en el render. Sin dependencia de una lista hardcodeada de monedas soportadas (que quedaría obsoleta).
