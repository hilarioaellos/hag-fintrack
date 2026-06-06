# Auditoría — Borrado masivo de datos (clearUserData) — 2026-06-06

## Resumen

Implementación de operación de limpieza total de datos de prueba, accesible desde Settings → Danger Zone. Objetivo: facilitar la transición de QA a Fase 2 (usuarios reales) sin tener que borrar registro por registro.

---

## Backend — `convex/fintrack/user_settings.ts`

### Mutation: `clearUserData`

**Firma:** `mutation({ args: {}, handler: async (ctx) => { ... } })`

**Autenticación:** `requireUserId(ctx)` — solo opera sobre datos del usuario autenticado. Imposible borrar datos de otro usuario.

**Tablas borradas (hard delete, en orden de dependencias):**

| Orden | Tabla | Motivo del orden |
|---|---|---|
| 1 | `fintrack_transaction_splits` | depende de transactions |
| 2 | `fintrack_transactions` | depende de accounts |
| 3 | `fintrack_reconciliations` | depende de accounts |
| 4 | `fintrack_credit_cards` | depende de accounts |
| 5 | `fintrack_cash_pockets` | depende de accounts |
| 6 | `fintrack_accounts` | independiente |
| 7 | `fintrack_budgets` | independiente |
| 8 | `fintrack_debts` | independiente |
| 9 | `fintrack_subscriptions` | accountId ya borrado (Convex no enforcea FK) |
| 10 | `fintrack_receivable_payments` | depende de receivables |
| 11 | `fintrack_receivables` | independiente |
| 12 | `fintrack_notifications` | independiente |
| 13 | `fintrack_merchants` | independiente |
| 14 | `fintrack_category_settings` | preferencias de categorías del usuario |
| 15 | `fintrack_categories` donde `isSystem === false` | categorías personalizadas creadas por el usuario |

**Tablas conservadas (intencionalmente):**

| Tabla | Razón |
|---|---|
| `fintrack_user_settings` | Preferencias de idioma, moneda, tema |
| `fintrack_categories` donde `isSystem === true` | Categorías del sistema (seed global), no son datos del usuario |

**Nota sobre balances:** Las transacciones se borran directamente sin revertir `applyBalanceDelta` porque las cuentas también se eliminan en la misma operación. No hay riesgo de balance inconsistente.

---

## Frontend — `src/components/settings/SettingsForm.tsx`

### Componente: `DangerZone`

**UX — 4 estados:**

| Estado | UI |
|---|---|
| `idle` | Botón rojo "Limpiar datos de prueba" (outline) |
| `confirming` | Warning texto + input de confirmación + Cancel / Confirmar. Si hubo error previo, muestra mensaje de fallo. |
| `clearing` | Texto "Eliminando…" |
| `done` | "✓ Datos eliminados" (verde, auto-reset a idle en 4s) |

**Doble confirmación:** El usuario debe escribir la palabra clave exacta en un input antes de que el botón "Sí, eliminar todo" se habilite. La palabra se obtiene de la clave `settings.clearDataConfirmWord` (`DELETE` en EN, `ELIMINAR` en ES) — sin depender de búsqueda de substring en el texto del prompt.

**Reset de confirmText:** Se limpia en tres momentos: al cancelar (`resetConfirm()`), al completar exitosamente (antes de setStep "done"), y al hacer auto-reset al volver a "idle".

**Manejo de error:** En caso de excepción en `clearUserData`, el estado vuelve a `confirming` y se muestra `t("clearDataError")` encima de los botones.

**Renderizado:** Card separada en Settings con borde rojo (`color-mix(in srgb, var(--color-ft-bad) 40%, ...)`) para distinguirla visualmente de las demás cards.

### Traducciones agregadas

| Clave | EN | ES |
|---|---|---|
| `settings.dangerZone` | Danger Zone | Zona de Riesgo |
| `settings.clearData` | Clear test data | Limpiar datos de prueba |
| `settings.clearDataDesc` | Permanently deletes all accounts… | Elimina permanentemente… |
| `settings.clearDataConfirmPrompt` | …Type {word} to confirm. | …Escribe {word} para confirmar. |
| `settings.clearDataConfirmWord` | DELETE | ELIMINAR |
| `settings.clearDataConfirm` | Yes, delete everything | Sí, eliminar todo |
| `settings.clearDataClearing` | Deleting… | Eliminando… |
| `settings.clearDataDone` | All data cleared | Datos eliminados |
| `settings.clearDataError` | Failed to clear data. Please try again. | Error al eliminar los datos. Intenta de nuevo. |

EN = ES = 346 claves totales tras los cambios.

---

## Riesgo

**Alto — operación irreversible.** Mitigaciones implementadas:
1. Botón no ejecuta directamente — requiere cambio de estado a "confirming"
2. Campo de texto con palabra clave (DELETE / ELIMINAR) antes de habilitar el botón final
3. Operación acotada al `userId` del usuario autenticado — imposible afectar otros usuarios
4. `fintrack_user_settings` conservado — el usuario no pierde sus preferencias

**Escalabilidad:** Para datasets de prueba (< 200 registros por tabla) la mutation no superará el tiempo límite de Convex. Para datasets más grandes en el futuro se podría migrar a una Action con múltiples mutations en batches.

---

## Verificación ejecutada

- typecheck OK
- lint OK
- Mutation visible en `src/convex-generated/` tras `npm run sync-types`
