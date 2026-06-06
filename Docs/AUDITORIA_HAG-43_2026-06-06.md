# Auditoría HAG-43 — CSV Import: soporte DD/MM/YYYY y YYYY-MM-DD

**Fecha:** 2026-06-06  
**Issue:** HAG-43  
**Módulo:** CSV Import (frontend + backend comment)

---

## Problema

El backend (`parseDateSafe`) aceptaba `YYYY-MM-DD` (ISO) y `MM/DD/YYYY` (US).  
Faltaba `DD/MM/YYYY` — el formato más común en bancos europeos y latinoamericanos.

Sin selector de formato, si un banco exporta `05/06/2024` (5 de junio), el parser
lo leía como mayo 6 (MM/DD/YYYY), importando fechas incorrectas silenciosamente.

---

## Solución

**Patrón:** el frontend normaliza a `YYYY-MM-DD` antes de enviar al backend. El backend ya lo acepta sin cambios.

### Función `normalizeDate(raw, format)` añadida a `CSVImportDialog.tsx`

```ts
function normalizeDate(raw: string, format: DateFormat): string {
  if (format === "YYYY-MM-DD") return s;  // pass-through
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!match) return s;  // deja que backend rechace con error claro
  if (format === "DD/MM/YYYY") {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // MM/DD/YYYY
  const [, mm, dd, yyyy] = match;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}
```

### Selector de formato en el paso "map"

Nuevo campo `Date format` con tres opciones:
- `MM/DD/YYYY` (US) — default
- `DD/MM/YYYY` (Europe / LATAM)  
- `YYYY-MM-DD` (ISO)

### `handleMapConfirm`
`date: row[di]` → `date: normalizeDate(row[di] ?? "", dateFormat)`

---

## No cambia el backend

`parseDateSafe` en `import.ts` no cambia su lógica — solo se actualiza el comentario para documentar que DD/MM/YYYY se normaliza en el frontend.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/transactions/CSVImportDialog.tsx` | + tipo `DateFormat`, + `normalizeDate()`, + `dateFormat` state, + selector UI, normalización en `handleMapConfirm` |
| `convex/fintrack/import.ts` | Comentario actualizado (sin cambio de lógica) |

---

## Verificación

- [ ] CSV con fechas `05/06/2024` + formato DD/MM/YYYY → preview muestra fecha correcta (5 jun)
- [ ] CSV con fechas `05/06/2024` + formato MM/DD/YYYY → preview muestra fecha correcta (6 may)  
- [ ] CSV con fechas `2024-06-05` + formato YYYY-MM-DD → preview muestra fecha correcta
- [ ] Fecha inválida `32/01/2024` → backend rechaza con error claro (row N: invalid date)
- [ ] Reset del diálogo limpia `dateFormat` a "MM/DD/YYYY"
- [ ] `npm run typecheck` sin errores
- [ ] `npm run lint` sin errores
