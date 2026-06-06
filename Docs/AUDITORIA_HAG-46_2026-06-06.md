# Auditoría HAG-46 — CSV Import: estado parcial si falla entre batches

**Fecha:** 2026-06-06  
**Issue:** HAG-46  
**Módulo:** CSV Import (backend + frontend)

---

## Problema

`batchImport` (action) ejecuta mutaciones en bloques de 50 filas. Si el bloque N falla, los bloques 1..N-1 ya están commiteados en la BD pero el error lanzado al frontend solo decía "Import failed" — sin indicar cuántas filas se importaron antes del fallo.

El usuario no sabía si su data estaba parcialmente importada ni si podía re-intentar.

---

## Solución

### Backend (`import.ts`)

El loop de batches ahora tiene `try/catch` por batch:
- Si un batch falla: registra el error en `partialError`, hace `break` (no sigue al siguiente batch)
- Devuelve `{ imported, skipped, skippedRows, partialError?: string }` en vez de lanzar

`partialError` incluye: `"Batch N/Total failed: <mensaje>"` para identificar dónde ocurrió.

El throw NO ocurre — la función siempre retorna un resultado, parcial o completo.

### Frontend (`CSVImportDialog.tsx`)

El paso "done" ahora maneja `partialError`:
- Ícono y título cambian: `CheckCircle` (warn color) + "Partial import"
- Banner de error rojo con el mensaje técnico
- Nota de seguridad: "You can re-run the import safely — already-imported rows will be skipped automatically."

### Por qué el re-import es seguro

Cada fila tiene un `importHash` (SHA-256 de `accountId|date|amount|description`). Las filas ya importadas se saltan como duplicados automáticamente. El usuario puede re-subir el mismo CSV y solo se importarán las filas que fallaron.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `convex/fintrack/import.ts` | Loop de batches con try/catch; retorna `partialError?` en lugar de lanzar |
| `src/components/transactions/CSVImportDialog.tsx` | Tipo result con `partialError?`; banner de error parcial en paso done |
| `src/convex-generated/` | Sync de tipos tras cambio de return type |

---

## Verificación

- [ ] Import con todos batches OK: ícono verde, "Import complete", sin banner de error
- [ ] Import con fallo simulado en batch 2: ícono warn, "Partial import", banner con "Batch 2/N failed: ..."
- [ ] Re-import del mismo CSV tras fallo parcial: filas ya importadas se saltan, solo se importan las restantes
- [ ] `npm run typecheck` sin errores
- [ ] `npm run lint` sin errores
