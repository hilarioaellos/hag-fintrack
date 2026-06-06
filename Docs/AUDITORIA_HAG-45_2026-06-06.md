# Auditoría HAG-45 — SkippedRow como tipo TypeScript nombrado

**Fecha:** 2026-06-06  
**Issue:** HAG-45  
**Módulo:** CSV Import (frontend + backend) — refactor puro, sin cambio de comportamiento

---

## Problema

`SkippedRow` era un tipo anónimo definido en tres lugares distintos:

| Lugar | Problema |
|---|---|
| `CSVImportDialog.tsx:76` | Definido DENTRO de la función del componente — type dentro de función no se comparte ni es reutilizable |
| `import.ts:97-103` | Objeto anónimo inline en `batchImport` handler |
| `import.ts:151-157` | Objeto anónimo inline en `importBatch` handler (duplicado) |

---

## Solución

### Frontend (`CSVImportDialog.tsx`)
`type SkippedRow` movido a nivel módulo — antes de `normalizeDate()` y los demás tipos de módulo (`Step`, `DateFormat`, `CsvRow`).

### Backend (`import.ts`)
`type SkippedRow` declarado a nivel módulo (antes de `csvRowValidator`). Los dos `const skippedRows: { ... }[]` reemplazados por `const skippedRows: SkippedRow[]`.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/transactions/CSVImportDialog.tsx` | `type SkippedRow` a nivel módulo; eliminada la definición inline dentro del componente |
| `convex/fintrack/import.ts` | `type SkippedRow` a nivel módulo; 2 definiciones anónimas → `SkippedRow[]` |

---

## Verificación

- [ ] Sin cambio de comportamiento en runtime
- [ ] `npm run typecheck` sin errores (frontend)
- [ ] `npx tsc --noEmit` sin errores (backend)
- [ ] `npm run lint` sin errores
