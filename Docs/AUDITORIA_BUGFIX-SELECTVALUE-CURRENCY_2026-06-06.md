# Auditoría — Bugfix: SelectValue IDs + Currency auto-derive

**Fecha:** 2026-06-06  
**Archivos modificados:**
- `src/components/subscriptions/SubscriptionFormDialog.tsx`
- `src/components/debts/DebtFormDialog.tsx`
- `src/components/receivables/ReceivableFormDialog.tsx`

---

## Bug: SelectValue mostraba ID de Convex en lugar del nombre

Mismo patrón que el fix anterior en TransactionFormDialog. Radix UI `<SelectValue>` sin children muestra el raw value (Convex ID) cuando los items aún están cargando.

### Fix aplicado
- **SubscriptionFormDialog**: `selectedAccount` y `selectedCat` computed como derived values; SelectValue con children explícitos para account y category.
- **SubscriptionFormDialog**: Category SelectItems ahora incluyen `{c.icon}` (antes solo `{c.name}`).

---

## Bug: Iconos de categoría no aparecían en el dropdown de Suscripciones

Los `<SelectItem>` de categorías en SubscriptionFormDialog usaban solo `{c.name}`, sin `{c.icon}`. Corregido.

---

## Feature: Moneda auto-derivada de cuentas (Debt, Receivable, Subscription)

### Motivación
El usuario tenía que escribir manualmente el código ISO de moneda (ej. "MXN") en todos los formularios, sin saber qué monedas tiene disponibles.

### Fix aplicado

**SubscriptionFormDialog**:
- Eliminado el campo de texto `Currency`.
- `useEffect` que observa `accountId`: cuando el usuario selecciona una cuenta, `currency` se auto-actualiza con `account.currencyCode`.
- La moneda se muestra como badge inline junto al selector de cuenta (solo lectura).

**DebtFormDialog** y **ReceivableFormDialog**:
- Agregado `useQuery(api.fintrack.accounts.list)` y `useQuery(api.fintrack.user_settings.get)`.
- `currencyOptions` = unique currencies de todas las cuentas del usuario + `defaultCurrency`.
- Campo Currency reemplazado por `<Select>` mostrando esas opciones.
- `useEffect` depende de `open` (no solo de `userSettings`) → se ejecuta cada vez que el dialog abre en create mode, garantizando que siempre refleja `defaultCurrency` aunque el modal se haya cerrado y reabierto.
- `reset()` usa `debt/receivable?.currencyCode ?? userSettings?.defaultCurrency ?? "USD"` → no hardcodea "USD".
- En edit mode: Select deshabilitado (currencyCode no cambia en edición).

**SubscriptionFormDialog**:
- `useEffect` de auto-derive acotado a `!isEdit` → no normaliza silenciosamente datos legacy en edit mode.
- Placeholder del account selector: "Loading…" mientras carga, "Select account" cuando no hay selección.

### Verificar
- Crear suscripción: seleccionar cuenta BBVA → badge muestra "MXN" automáticamente.
- Crear deuda: Select de moneda muestra MXN y USD (las monedas de las cuentas del usuario).
- Crear acreencia: idem. Moneda en edit mode = disabled.
- Suscripción: categoría muestra icono + nombre en trigger y en opciones del dropdown.
