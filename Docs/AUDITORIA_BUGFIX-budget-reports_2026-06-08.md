# Auditoría — Bugfix: páginas Budget y Reports en blanco
**Fecha:** 2026-06-08  
**Estado:** Listo para auditoría — pendiente commit

---

## Contexto

Al navegar a `/budget` y `/reports` la página aparecía completamente en blanco. Dos bugs independientes causaban un crash de React en cada página.

---

## Bug 1 — Budget: `ReferenceError` en `BudgetFormDialog`

### Causa
`BudgetFormDialog.tsx` línea 51 usaba `categoryId` dentro del callback de `.find()` antes de que la variable fuera declarada con `const [categoryId] = useState(...)` en la línea 53.

```tsx
// ANTES (crash)
const selectedCat = availableCategories.find((c) => c._id === categoryId); // ← categoryId no existe aún
const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "");
```

Aunque `categoryId` está en el mismo scope de la función, la variable `const` está en la Temporal Dead Zone (TDZ) hasta su declaración. El callback de `.find()` se ejecuta **síncronamente**, accediendo `categoryId` en TDZ → `ReferenceError: Cannot access 'categoryId' before initialization`.

El componente `BudgetFormDialog` siempre se monta (incluso con `open={false}`), por lo que el crash ocurría en cada render de `BudgetList` → crash de `BudgetPage`.

### Solución — `BudgetFormDialog.tsx`
Mover el `useState` antes de `selectedCat`:

```tsx
// DESPUÉS (correcto)
const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "");
const selectedCat = availableCategories.find((c) => c._id === categoryId);
```

---

## Bug 2 — Reports: funciones de backend no desplegadas

### Causa
`NetWorthCard.tsx` (añadido en HAG-69) llama a:
- `api.fintrack.reports.netWorthSnapshot`
- `api.fintrack.reports.netWorthHistory`

Estas funciones **no están en los tipos generados** (`src/convex-generated/`), lo que indica que no han sido desplegadas en el backend Convex. Cuando Convex devuelve un error por función inexistente, el hook `useQuery` lanza durante el render. Sin error boundary, el crash se propaga por toda la página.

### Solución — `ReportShell.tsx`
Añadir un `ChartErrorBoundary` (class component) que aísla cada gráfico. Si uno falla, los demás siguen renderizando normalmente y el card afectado muestra "No disponible" en lugar de tumbar la página.

```tsx
class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError)
      return <p style={{ color: "var(--color-ft-text-3)" }}>No disponible</p>;
    return this.props.children;
  }
}
```

Cada `<ReportCard>` ahora envuelve su chart con `<ChartErrorBoundary>`.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/budget/BudgetFormDialog.tsx` | Reordenar `useState` antes de `selectedCat` |
| `src/components/reports/ReportShell.tsx` | Añadir `ChartErrorBoundary` + envolver cada chart |

---

## Puntos a verificar durante la auditoría

- [ ] `/budget` carga sin página en blanco
- [ ] El diálogo "Agregar Presupuesto" abre y muestra categorías correctamente
- [ ] El diálogo "Editar Presupuesto" abre y pre-carga el monto
- [ ] `/reports` carga sin página en blanco
- [ ] Los 3 charts existentes (Income/Expenses, Category Pie, Cash Flow) renderizan
- [ ] El card "Patrimonio Neto" muestra "No disponible" si el backend no está desplegado, o el gráfico si sí lo está
- [ ] Navegar entre páginas no causa crashes

---

## Pendiente después del commit

1. Desplegar `netWorthSnapshot` y `netWorthHistory` en el backend (`Landingpage-HAG-Partner`)
2. Correr `npm run sync-types` en `hag-fintrack`
3. Verificar que el card "Patrimonio Neto" muestra el gráfico histórico
