# Auditoria HAG-74 - Categories Cleanup + Onboarding Setup Wizard

**Fecha:** 2026-06-12  
**Estado:** GO

---

## Alcance Auditado

Plan v3 para:

1. Limpiar categorias legacy del DB automaticamente.
2. Permitir borrar cualquier categoria, incluyendo categorias de sistema.
3. Mostrar un wizard bloqueante la primera vez para que el usuario defina su lista personal.

Decisiones fijas auditadas:

- `seed()` se salta si `categoriesReviewed === true`.
- Re-open desde Settings via `CategoryOnboardingProvider`.
- `CatRow` usa grid universal.

---

## Resultado

**GO**

No quedan bloqueantes ni mayores abiertos en la version final del plan. Los puntos que previamente hacian `NOGO` quedaron cubiertos explicitamente.

---

## Mayores Revisados

| Punto | Estado |
|---|---|
| `markCategoriesReviewed` debe hacer upsert completo e incluir campos requeridos como `defaultCurrency` al insertar | Cubierto |
| El wizard debe impedir cierre real usando los APIs correctos de Base UI | Cubierto |
| `Done` debe hacer flush de mutations pendientes antes de marcar revisado | Cubierto |
| `clearUserData` debe resetear `categoriesReviewed: false` | Cubierto |
| La lista actual de categorias de sistema se reduce via wizard, no via `cleanLegacySystemCategories` | Cubierto |
| `cleanLegacySystemCategories` borra legacy sin recuperacion | Cubierto como asuncion documentada |

---

## Puntos Clave Para Implementacion

### Backend

- Agregar `categoriesReviewed: v.optional(v.boolean())` en `fintrack_user_settings`.
- Extraer helper privado `_deleteCategory(ctx, userId, catId)` con cascade completo.
- Quitar el guard `isSystem` de `remove()`.
- Crear `cleanLegacySystemCategories`, idempotente, borrando categorias `isSystem: true` fuera de `SYSTEM_CATEGORIES`.
- `cleanLegacySystemCategories` debe devolver `{ deleted: number }`.
- Agregar guard en `seed()`:

```ts
if (settings?.categoriesReviewed === true) return;
```

- Crear `markCategoriesReviewed` como upsert completo.
- Actualizar `clearUserData` para hacer `categoriesReviewed: false`.

### Frontend

- Crear `CategoryOnboardingProvider` con `{ isOpen, open, close }`.
- `CategorySettingsInit` debe leer settings antes de correr:
  - siempre `cleanLegacySystemCategories()`
  - saltar `seed()` si `categoriesReviewed === true`
  - siempre `initializeSettings()`
- `AppShell` debe envolver con provider y montar `CategoryOnboardingModal`.
- `CategoryOnboardingModal` debe:
  - auto-abrir si `categoriesReviewed !== true`
  - bloquear cierre por Esc/click fuera con APIs reales de Base UI
  - usar `showCloseButton={false}`
  - aplicar cambios pendientes antes de `markCategoriesReviewed()`
- `SettingsForm` debe:
  - usar grid universal `"1fr 80px 80px 56px"`
  - mostrar delete para categorias de sistema
  - mantener rename bloqueado para categorias de sistema
  - agregar CTA `Re-run category setup` usando el context

---

## Sugerencias

- Reutilizar `CategoryRow` entre Settings y Modal solo si no complica el cambio.
- Ejecutar `npx convex dev --once` antes de `npm run sync-types`.
- Mantener el bloqueo de rename en categorias de sistema, porque el alcance solo requiere permitir borrarlas.
- Documentar en el commit que `cleanLegacySystemCategories` elimina categorias legacy sin recuperacion.

---

## Verificacion Esperada

- Wizard aparece bloqueante en primera sesion.
- Esc/click fuera no cierran el wizard.
- Borrar categoria de sistema funciona y no reaparece tras recarga.
- `TransactionFormDialog` no re-siembra categorias si `categoriesReviewed === true`.
- Settings -> `Re-run category setup` abre el wizard sin resetear DB.
- `clearUserData` hace que el wizard reaparezca.
- `npm run typecheck` sin errores.
- `npm run lint` sin errores.
