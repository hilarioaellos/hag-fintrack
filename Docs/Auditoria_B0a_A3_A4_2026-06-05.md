# Auditoría de Cambios — Bloque 0a + A3 + A4
**Fecha:** 2026-06-05  
**Issues:** HAG-55 (B0a), HAG-56 (A3), HAG-57 (A4)  
**Estado:** Listos para revisión. NO hacer push hasta aprobación.

---

## Resumen ejecutivo

| Área | Cambio | Riesgo |
|---|---|---|
| Schema Convex | Nueva tabla + campo opcional | Bajo — aditivo, sin romper tablas existentes |
| `categories.ts` | Seed expandido + 4 nuevas funciones | Medio — seed es aditivo pero cambia el contrato de `list` vs `listActive` |
| `reports.ts` | Filtro `effectiveExclude` en `expensesByCategory` | Bajo — solo excluye si el usuario configura explícitamente |
| `budgets.ts` | Rollup subcategoría→padre en `listWithActuals` | Bajo — aditivo, no cambia lógica para usuarios sin subcategorías |
| `TransactionFormDialog.tsx` | Cambia query + agrega `initializeSettings` on open | Medio — cambio de fuente de datos, verificar que no devuelva vacío para usuarios existentes |
| `BudgetFormDialog.tsx` | Cambia query | Mismo riesgo que TransactionFormDialog |
| `SettingsForm.tsx` | Nueva sección visual | Bajo — solo UI, no afecta funcionalidad existente |
| `BudgetRow.tsx` | Indentación para subcategorías | Bajo — solo visual, sin lógica nueva |

---

## 1. Schema — `Landingpage-HAG-Partner/convex/schema.ts`

### Qué cambió
```diff
  fintrack_categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    parentId: v.optional(v.id("fintrack_categories")),
    isSystem: v.boolean(),
+   forceExclude: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_parent", ["parentId"]),

+ fintrack_category_settings: defineTable({
+   userId: v.id("users"),
+   categoryId: v.id("fintrack_categories"),
+   isActive: v.boolean(),
+   excludeFromReports: v.boolean(),
+ })
+   .index("by_user", ["userId"])
+   .index("by_user_category", ["userId", "categoryId"]),
```

### Qué verificar
- [ ] `forceExclude` es opcional — registros existentes de `fintrack_categories` no se rompen (Convex trata `undefined` como ausente)
- [ ] Los dos índices de `fintrack_category_settings` son correctos y no hay duplicados
- [ ] La tabla nueva no afecta ninguna query existente (solo se usa en las nuevas funciones)

---

## 2. Backend categories — `Landingpage-HAG-Partner/convex/fintrack/categories.ts`

### Qué cambió

#### SYSTEM_CATEGORIES expandido (9 → 24)
```
Antes: Food & Dining, Transportation, Shopping, Bills & Utilities,
       Health, Entertainment, Income, Transfer, Other (9 total)

Ahora: Groceries, Restaurants, Transportation, Utilities,
       Entertainment, Shopping, Healthcare, Insurance, Rent, Gym,
       Phone, Travel, Subscriptions, Gifts, Pets, Books, Other (17 gastos)
       + Salary, Freelance, Bonus, Investment Returns, Gift Income,
         Rental Income, Other Income (7 ingresos) = 24 total
```

#### `seed` — lógica cambiada de "skip si existe" a "aditiva por nombre"
```diff
- // No-op si ya existe cualquier categoría
- const existing = await ctx.db.query(...).first();
- if (existing) return;
- for (const cat of SYSTEM_CATEGORIES) { await ctx.db.insert(...) }

+ // Aditivo: solo inserta las que no existen por nombre
+ const existing = await ctx.db.query(...).collect();
+ const existingNames = new Set(existing.map(c => c.name));
+ for (const cat of SYSTEM_CATEGORIES) {
+   if (!existingNames.has(cat.name)) { await ctx.db.insert(...) }
+ }
```

**⚠ Punto de atención:** Usuarios existentes que tenían las 9 categorías originales recibirán las 15 nuevas la próxima vez que se llame `seed`. Sus transacciones y presupuestos existentes NO se ven afectados porque siguen apuntando a los IDs originales.

#### `listActive` — nueva query
```typescript
// Si no hay settings → devuelve TODAS las categorías (backward compat)
// Si hay settings → devuelve solo las con isActive=true
export const listActive = query({ ... })
```

**⚠ Punto de atención:** Para usuarios existentes que nunca llamaron `initializeSettings`, `listActive` devuelve el mismo resultado que `list` (todas). El comportamiento cambia solo DESPUÉS de que el usuario inicializa settings desde `/settings`.

#### `initializeSettings` — nueva mutation idempotente
```typescript
// Crea registros en fintrack_category_settings solo para categorías
// que todavía no tienen uno. Safe to call multiple times.
export const initializeSettings = mutation({ ... })
```

#### `updateSetting` — nueva mutation
```typescript
// Actualiza isActive y/o excludeFromReports para una categoría.
// Valida que la categoría pertenezca al usuario y no tenga forceExclude.
export const updateSetting = mutation({ ... })
```

#### `create` — modificado
```diff
+ // Auto-creates settings for user-created categories
+ await ctx.db.insert("fintrack_category_settings", {
+   userId, categoryId: catId, isActive: true, excludeFromReports: false,
+ });
```

### Qué verificar
- [ ] `seed` no genera duplicados si se llama múltiples veces en un usuario existente
- [ ] `listActive` devuelve todas las categorías cuando `settings.length === 0`
- [ ] `initializeSettings` no crea duplicados (verifica `settledCatIds` antes de insertar)
- [ ] `updateSetting` lanza error si `cat.forceExclude === true`
- [ ] `create` crea el settings record correctamente — no falla si ya existe uno (no debería, es nuevo)

---

## 3. Backend reports — `Landingpage-HAG-Partner/convex/fintrack/reports.ts`

### Qué cambió

#### Nueva función helper `getExcludedCategoryIds`
```typescript
// Regla: effectiveExclude = category.forceExclude || setting.excludeFromReports
// Categorías INACTIVAS (isActive=false) NO se excluyen del histórico.
// Solo se excluyen las que el usuario marcó explícitamente con excludeFromReports.
async function getExcludedCategoryIds(db, userId): Promise<Set<string>>
```

#### `expensesByCategory` — aplica el filtro
```diff
+ const excluded = await getExcludedCategoryIds(ctx.db, userId);
  for (const tx of txs) {
    if (tx.type !== "expense" || !tx.categoryId || tx.currencyCode !== currency) continue;
+   if (excluded.has(tx.categoryId)) continue;
    totals[tx.categoryId] = ...
  }
```

### Qué verificar
- [ ] `incomeVsExpenses` y `cashFlowByDay` NO usan `getExcludedCategoryIds` — correcto, son agregados por tipo/día, no por categoría
- [ ] Si el usuario no tiene `fintrack_category_settings`, `getExcludedCategoryIds` devuelve `Set` vacío → el reporte muestra todo como antes
- [ ] Si una categoría tiene `forceExclude=true` pero no tiene settings record, igual queda excluida (segundo loop del helper)
- [ ] El filtro solo aplica a `expensesByCategory` — los otros reportes no cambian

---

## 4. Backend budgets — `Landingpage-HAG-Partner/convex/fintrack/budgets.ts`

### Qué cambió — `listWithActuals`
```diff
+ // Pre-fetch categorías para evitar N+1
+ const usedCatIds = new Set(monthTransactions.map(tx => tx.categoryId).filter(Boolean));
+ const catCache: Record<string, { parentId?: string }> = {};
+ for (const id of usedCatIds) {
+   const cat = await ctx.db.get(id);
+   if (cat) catCache[id] = { parentId: cat.parentId ?? undefined };
+ }

  const actualMap: Record<string, number> = {};
  for (const tx of monthTransactions) {
    if (!tx.categoryId) continue;
    actualMap[tx.categoryId] = (actualMap[tx.categoryId] ?? 0) + Math.abs(tx.amountCents);
+   // Rollup: si la categoría tiene padre, también suma al padre
+   const parent = catCache[tx.categoryId]?.parentId;
+   if (parent) {
+     actualMap[parent] = (actualMap[parent] ?? 0) + Math.abs(tx.amountCents);
+   }
  }
```

### Qué verificar
- [ ] Usuarios sin subcategorías: `catCache` no tendrá `parentId` en ninguna entrada → comportamiento idéntico al anterior
- [ ] Double-counting: si un presupuesto existe para TANTO la subcategoría COMO el padre, el gasto aparece en ambos. Esto es correcto por diseño (el padre muestra el total acumulado)
- [ ] El pre-fetch itera `usedCatIds` (único por transacción), no `monthTransactions` — no hay N+1

---

## 5. Frontend TransactionFormDialog — `src/components/transactions/TransactionFormDialog.tsx`

### Qué cambió
```diff
- const categories = useQuery(api.fintrack.categories.list);
+ const categories = useQuery(api.fintrack.categories.listActive);
+ const initCategorySettings = useMutation(api.fintrack.categories.initializeSettings);

- useEffect(() => {
-   if (open && categories !== undefined && categories.length === 0) {
-     seedCategories();
-   }
- }, [open, categories, seedCategories]);
+ useEffect(() => {
+   if (!open) return;
+   if (categories !== undefined && categories.length === 0) {
+     seedCategories().then(() => initCategorySettings());
+   } else if (categories !== undefined) {
+     initCategorySettings();
+   }
+ }, [open]); // eslint-disable-line
```

### Qué verificar
- [ ] **Riesgo principal:** `listActive` devuelve vacío si settings están inicializados pero todas las categorías están marcadas inactivas. En ese caso el selector quedaría vacío. Improbable, pero posible si el usuario desactiva todo en Settings.
- [ ] El efecto corre cada vez que el dialog se abre — `initializeSettings` es idempotente, no hay problema de duplicados
- [ ] El `eslint-disable` en el array de dependencias es intencional: no queremos que el efecto re-corra si `categories` cambia reactivamente

---

## 6. Frontend BudgetFormDialog — `src/components/budget/BudgetFormDialog.tsx`

### Qué cambió
```diff
- const categories = useQuery(api.fintrack.categories.list);
+ const categories = useQuery(api.fintrack.categories.listActive);
```

### Qué verificar
- [ ] Mismo riesgo que TransactionFormDialog: si todas las categorías están inactivas, el selector queda vacío
- [ ] Este componente NO llama `initializeSettings` — lo delega a TransactionFormDialog. Si el usuario va primero a Presupuesto sin pasar por Transacciones, `listActive` puede devolver todas (sin settings) o el subset activo. Aceptable.

**Recomendación:** Mover `initializeSettings` a un nivel más alto (AppShell o el layout del dashboard) para garantizar que siempre esté inicializado.

---

## 7. Frontend SettingsForm — `src/components/settings/SettingsForm.tsx`

### Qué cambió
Nuevo componente `CategoryPreferences` agregado dentro del archivo. Agrega:
- Sección "Category Preferences" en la página de Settings
- Lista de todas las categorías del usuario con toggles `isActive` y `excludeFromReports`
- Categorías con `forceExclude=true` muestran 🔒 y tienen los toggles deshabilitados
- Estado local `pending` acumula cambios antes de guardar (no llama la mutation en cada click)
- `initializeSettings` se llama on mount para garantizar que existan settings

### Qué verificar
- [ ] El botón "Save" solo se habilita si `Object.keys(pending).length > 0` — no envía llamadas vacías
- [ ] Los toggles de toggle de "In Reports" tienen lógica inversa: verde = incluido, rojo = excluido. Verificar que la UI sea clara para el usuario
- [ ] `initializeSettings` se llama en `useEffect([], [])` — solo on mount. Si se agregan categorías nuevas después, no se auto-inicializan hasta el próximo mount. Aceptable.
- [ ] El scroll del listado de categorías tiene `max-h-64` — con 24 categorías debería ser suficiente sin overflow extremo

---

## 8. Frontend BudgetRow — `src/components/budget/BudgetRow.tsx`

### Qué cambió
```diff
+ const isSubcategory = !!category?.parentId;

  <div
    className="px-4 py-3 ..."
+   style={{
+     ...(isSubcategory && {
+       paddingLeft: "2rem",
+       borderLeft: "2px solid var(--color-ft-border)"
+     })
+   }}
  >
+   {isSubcategory && <span className="text-xs">↳</span>}
    <span className="text-lg">{category?.icon}</span>
    <span
      style={{
-       color: "var(--color-ft-text)"
+       color: isSubcategory ? "var(--color-ft-text-2)" : "var(--color-ft-text)"
      }}
    >
```

### Qué verificar
- [ ] Usuarios sin subcategorías: `category?.parentId` es siempre `undefined` → `isSubcategory = false` → sin cambio visual
- [ ] El orden de la lista en `BudgetList` no está garantizado: el padre puede aparecer DESPUÉS de la subcategoría. Si eso pasa la indentación será confusa.

**Recomendación (opcional):** Ordenar los budgets en `listWithActuals` de forma que padres aparezcan antes que sus hijos. Bajo prioridad — la mayoría de los usuarios no usarán subcategorías de inmediato.

---

## Checklist final antes de aprobar

### Backend (Landingpage-HAG-Partner)
- [ ] Hacer `npx convex dev` para desplegar schema y funciones nuevas
- [ ] Verificar en Convex dashboard que `fintrack_category_settings` aparece como tabla
- [ ] Verificar que `categories.listActive`, `categories.initializeSettings`, `categories.updateSetting` están disponibles como funciones deployadas

### Frontend (hag-fintrack)
- [ ] `npm run sync-types` — ya ejecutado, tipos sincronizados
- [ ] `npx tsc --noEmit` — limpio en ambos proyectos (verificado)
- [ ] Abrir `/settings` → verificar sección "Category Preferences" visible
- [ ] Abrir `/transactions` → crear gasto → selector de categoría muestra categorías activas
- [ ] Abrir `/budget` → agregar línea → selector de categoría muestra categorías activas
- [ ] Abrir `/reports` → pie chart no muestra categorías con `excludeFromReports=true`
- [ ] Crear subcategoría → crear presupuesto para el padre → registrar gasto en subcategoría → verificar que el actual del padre incluye el gasto

### Regresión
- [ ] Usuarios existentes: `/transactions`, `/budget`, `/reports` cargan sin error
- [ ] Crear transacción, crear presupuesto — funciona como antes
- [ ] `copyFromPreviousMonth` en presupuesto — sin cambios, verificar que sigue funcionando

---

*Generado automáticamente por Claude Code — 2026-06-05*
