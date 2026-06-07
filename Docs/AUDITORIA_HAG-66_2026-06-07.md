# Auditoría — HAG-66: Categorías personalizadas (2026-06-07)

## Resumen

Permite al usuario crear, editar y eliminar categorías propias (isSystem: false) directamente desde Settings → Category Preferences.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `Landingpage-HAG-Partner/convex/fintrack/categories.ts` | Mutations `update` y `remove`; query `listWithSettings` |
| `src/components/settings/SettingsForm.tsx` | UI extendida con crear/editar/eliminar; usa `listWithSettings` |
| `src/convex-generated/` | Sync de tipos |

---

## Backend — `convex/fintrack/categories.ts`

### `listWithSettings` query
- Hace join de `fintrack_categories` + `fintrack_category_settings` por `categoryId`
- Devuelve `{ ...cat, isActive: boolean, excludeFromReports: boolean }` — `isActive` y `excludeFromReports` provienen de la fila de settings; fallback `true`/`false` si no hay settings todavía (usuario nuevo antes de `initializeSettings`)
- Reemplaza `list` en `CategoryPreferences` para que la UI muestre el estado real guardado en DB, no defaults implícitos

### `update` mutation
- Args: `id`, `name?`, `icon?`, `color?`
- Guarda `isSystem: true` protegida — lanza error si se intenta editar categoría del sistema
- Solo patchea campos que se pasen (no sobreescribe lo que no cambia)

### `remove` mutation
- Args: `id`
- Guarda `isSystem: true` protegida — lanza error si se intenta eliminar categoría del sistema
- Aplica estrategia explícita por cada tabla que referencia `fintrack_categories`:

| Tabla | Campo | Requerido | Acción |
|---|---|---|---|
| `fintrack_transactions` | `categoryId` | optional | `undefined` (via `by_category` index) |
| `fintrack_budgets` | `categoryId` | required | delete (fila sin categoría no tiene sentido) |
| `fintrack_transaction_splits` | `categoryId` | required | delete el split |
| `fintrack_transaction_splits` | `subcategoryId` | optional | `undefined` |
| `fintrack_subscriptions` | `categoryId` | optional | `undefined` |
| `fintrack_merchants` | `defaultCategoryId` | optional | `undefined` |
| `fintrack_categories` | `parentId` (hijos) | optional | `undefined` (reparenta a root via `by_parent` index) |
| `fintrack_category_settings` | `categoryId` | required | delete |

---

## Frontend — `SettingsForm.tsx`

### Componentes movidos a nivel de módulo
`CatRow` y `Toggle` se definen fuera de `CategoryPreferences` para cumplir con la regla ESLint `react-hooks/static-components` (no crear componentes durante render).

### UX por fila

| Tipo | Columnas |
|---|---|
| Categoría sistema | Nombre · Active toggle · Reports toggle |
| Categoría custom | Nombre · Active toggle · Reports toggle · ✏️ 🗑️ |

**Modo edición (inline):**
- Input para emoji/icono
- Input para nombre
- Paleta de 12 colores preset
- ✓ guardar / ✗ cancelar

**Modo eliminación (inline):**
- Banner rojo con advertencia: "Transactions will lose this category"
- ✓ confirmar / ✗ cancelar

### Crear nueva categoría
Botón "＋ New category" (dashed border) al pie de la lista → formulario inline con emoji, nombre y paleta de colores → botón Add / Cancel. Enter en el nombre también dispara la creación.

### Orden visual
Las categorías custom aparecen primero (sección "Custom"), luego las del sistema (sección "System").

---

## Riesgo

**Medio.** La mutation `remove` opera sobre 8 tablas. Mitigaciones:
- Ownership check (`cat.userId !== userId`) antes de actuar
- Índices usados donde existen (`by_category`, `by_parent`, `by_user_category`); resto filtrado en memoria por userId (dataset pequeño en app personal)
- Estrategia documentada y explícita por tabla — sin referencias colgantes

**Categorías sistema:** doble protección — backend lanza `ConvexError` si `isSystem: true`. El botón edit/delete no se renderiza en la UI para esas filas.

---

## Fix [NO GO] — estado real de categorías

**Problema:** `CategoryPreferences` usaba `categories.list` que no incluye settings. `CatRow` defaulteaba `isActive ?? true` y `excludeFromReports ?? false`, mostrando estado incorrecto al recargar.

**Solución:**
- Nueva query `listWithSettings` — join en backend, retorna `isActive` y `excludeFromReports` reales
- `CatRow` ahora lee `pending[cat._id]?.isActive ?? cat.isActive` (DB como base, pending solo como override local)
- `toggle` también usa `cat.isActive`/`cat.excludeFromReports` como fallback cuando la categoría no tiene pending aún
- Backend desplegado a `focused-swan-416` con `npx convex dev --once`
- Tipos re-sincronizados en hag-fintrack con `npm run sync-types`

---

## Verificación ejecutada

- frontend typecheck OK
- frontend lint OK (eslint SettingsForm.tsx --max-warnings=0)
- backend tsc --noEmit OK
- `npx convex dev --once` OK — deployed to focused-swan-416
