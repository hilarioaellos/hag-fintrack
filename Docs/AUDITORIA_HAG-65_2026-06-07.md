# Auditoría — HAG-65: Fusionar Cards en AccountFormDialog (2026-06-07)

## Resumen

Elimina la página `/cards` separada. Los datos de tarjeta de crédito (closingDay, paymentDueDay, creditLimit, minPayment) se gestionan directamente desde `AccountFormDialog` cuando el tipo de cuenta es `credit`. Las operaciones create y update son atómicas — una sola mutation Convex por operación.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `Landingpage-HAG-Partner/convex/fintrack/accounts.ts` | Mutations `createWithCard` y `updateWithCard` |
| `src/components/accounts/AccountFormDialog.tsx` | Campos de tarjeta inline; usa mutations compuestas |
| `src/components/accounts/AccountCard.tsx` | Acepta y pasa prop `card?` a AccountFormDialog |
| `src/components/accounts/AccountsList.tsx` | Query `cards.list` + mapa accountId → card |
| `src/components/layout/Sidebar.tsx` | Elimina entry `/cards` |
| `src/components/layout/Topbar.tsx` | Elimina "cards" de NavKey y ROUTES |
| `src/app/(dashboard)/cards/page.tsx` | Redirect a `/accounts` |
| `src/app/(dashboard)/credit-cards/` | Carpeta vacía eliminada |
| `messages/en.json` + `messages/es.json` | 7 claves nuevas en namespace `accounts` |

---

## Backend — `accounts.ts`

### `createWithCard` mutation

Crea account + card en una sola mutation (atómica por diseño de Convex):

1. Valida todos los campos de tarjeta antes de insertar nada
2. `ctx.db.insert("fintrack_accounts", { ..., type: "credit" })`
3. `ctx.db.insert("fintrack_credit_cards", { accountId, ... })`

Validaciones (espejo exacto de `cards.create`):
- `closingDay` y `paymentDueDay`: entero 1–28
- `creditLimitCents` y `minimumPaymentCents`: `validatePositiveCents` (> 0)

### `updateWithCard` mutation

Actualiza account + card en una sola mutation:

1. Ownership check
2. Valida que `account.type === "credit"`
3. Valida campos de tarjeta
4. `ctx.db.patch(id, accountPatch)`
5. Busca card existente via `by_account` index → patch si existe, insert si no (backward compat para cuentas credit sin card)

---

## Frontend — `AccountFormDialog.tsx`

### Atomicidad

| Escenario | Mutation usada |
|---|---|
| Create credit account | `accounts.createWithCard` |
| Create non-credit account | `accounts.create` |
| Edit credit account | `accounts.updateWithCard` |
| Edit non-credit account | `accounts.update` |

No hay llamadas secuenciales — cada escenario usa una sola mutation.

### Validación frontend (antes del submit)

`validateCardFields()` verifica:
- `closingDay`: entero 1–28
- `paymentDueDay`: entero 1–28
- `creditLimitCents > 0`
- `minimumPaymentCents > 0` ← añadido para paridad con backend

### Estado inicial

`useEffect([open, account, card])` re-sincroniza todos los campos al abrir el dialog, garantizando que al editar una cuenta distinta no quede estado stale.

---

## Topbar.tsx

Eliminadas "cards" de `NavKey` union type y del array `ROUTES`. El title bar ya no muestra "Cards" al entrar a `/cards` (que ahora redirige a `/accounts`).

---

## i18n — namespace `accounts`

7 claves nuevas (EN + ES):

| Clave | EN | ES |
|---|---|---|
| `editAccount` | Edit Account | Editar Cuenta |
| `name` | Name | Nombre |
| `bankName` | Bank Name | Banco |
| `initialBalance` | Initial Balance | Saldo Inicial |
| `currency` | Currency | Moneda |
| `creditCardDetails` | Credit Card Details | Datos de Tarjeta de Crédito |
| `type.label` | Type | Tipo |

Campos de tarjeta (`closingDay`, `dueDay`, `creditLimit`, `minPayment`) reusan namespace `cards` — sin duplicación.

---

## Fix [NO GO] — atomicidad

**Problema:** Create y edit usaban llamadas secuenciales (`accounts.create` → `cards.create`). Si la segunda fallaba, quedaba estado parcial.

**Solución:** Mutations compuestas `createWithCard` / `updateWithCard` en el backend. Convex ejecuta cada mutation como una transacción — si cualquier `ctx.db.insert/patch` falla, toda la mutation se revierte.

Adicionalmente: `validateCardFields()` ahora verifica `minimumPaymentCents > 0` en frontend para que el error se muestre antes del submit (paridad con validación backend).

---

## Riesgo

**Bajo.** Sin cambios en schema. Las mutations `cards.create` y `cards.update` originales se mantienen sin modificación (usadas por `CardsList`/`CreditCardFormDialog` que permanecen en el repo). La carpeta `credit-cards` eliminada estaba vacía.

---

## Verificación ejecutada

- frontend typecheck OK
- frontend lint OK (eslint accounts/ Topbar.tsx Sidebar.tsx --max-warnings=0)
- backend tsc --noEmit OK
- `npx convex dev --once` OK — deployed to `focused-swan-416`
- sync-types OK
