# Auditoría — Bugfix: Transaction Form — Select labels + stale edit state

**Fecha:** 2026-06-06  
**Issues:** Sin número Linear (bugs encontrados durante QA)  
**Archivos modificados:**
- `src/components/transactions/TransactionFormDialog.tsx`
- `src/components/transactions/TransactionsList.tsx`

---

## Bug 1 — Account y Category muestran ID de Convex en lugar del nombre

### Causa raíz
Radix UI `<SelectValue>` sin children busca el label del item seleccionado entre los `<SelectItem>` renderizados. Si `accounts` o `categories` aún están cargando (undefined), no hay SelectItems en el DOM — Radix no encuentra el match y muestra el raw value string (el Convex ID).

### Fix aplicado — `TransactionFormDialog.tsx`
- Account Select: `<SelectValue>` ahora tiene children explícitos que resuelven el nombre con `.find()` sobre el array de accounts cargado.
- Category Select: se computa `selectedCat` (derived value) antes del return y se usa como children de `<SelectValue>`.
- Ambos muestran un fallback ("Select account" / "Uncategorized") mientras el array está cargando.

### Verificar
- Abrir dialog de nueva transacción con filtro de cuenta activo → el SelectTrigger muestra el nombre de la cuenta, no el ID.
- Abrir dialog de edición → categoría muestra nombre + icono.
- Antes de que carguen las cuentas (latencia alta) → muestra "Select account", no el ID crudo.

---

## Bug 2 — Edit abre con datos de otra transacción

### Causa raíz
`useState` inicializadores solo corren una vez al montar el componente. El componente de edición (`TransactionFormDialog`) siempre está montado en el DOM (aunque cerrado). Al hacer `setEditTx(txA)`, el dialog abre con el estado inicial correcto. Al cerrar y abrir con `txB`, `reset()` limpia el estado pero usa los valores de la prop `transaction` en ese momento de cierre — y el siguiente `setEditTx(txB)` cambia la prop pero el estado ya no re-inicializa.

### Fix aplicado — `TransactionsList.tsx`
Añadido `key={editTx?._id ?? "edit-closed"}` al `TransactionFormDialog` de edición. Cuando cambia el `_id` de la transacción, React desmonta y remonta el componente, forzando que todos los `useState` corran con los valores del nuevo `transaction` prop.

### Verificar
- Crear 3 transacciones con montos/categorías distintos.
- Editar txA → verificar que el form muestra los datos de txA.
- Cerrar → editar txB → verificar que el form muestra los datos de txB (no los de txA).
- Editar txC directamente después → datos de txC.

---

## Cambios — resumen

| Archivo | Cambio |
|---|---|
| `TransactionFormDialog.tsx` | `selectedCat` derived value; `<SelectValue>` con children explícitos para account y category |
| `TransactionsList.tsx` | `key={editTx?._id ?? "edit-closed"}` en el dialog de edición |

## Riesgos
- Ninguno conocido. El `key` prop es un patrón React estándar para forzar remount controlado.
- Los children explícitos en `<SelectValue>` son compatibles con Radix UI v2.x.
