# Auditoría — Fix i18n: CSVImportDialog + severity.info (2026-06-06)

## Resumen

Dos fixes de i18n detectados durante QA:
1. `notifications.severity.info` mostraba "Info" en ES (sin traducir)
2. `CSVImportDialog` no usaba i18n — todos los strings hardcodeados en inglés

---

## Fix 1 — severity.info

**Archivo:** `messages/es.json`

**Cambio:**
```diff
- "info": "Info"
+ "info": "Información"
```

**Impacto:** Badge de severidad en `NotificationBell` ahora muestra "Información" en modo español.

---

## Fix 2 — CSVImportDialog i18n completo

**Archivos modificados:**
- `messages/en.json` — nuevo namespace `csvImport` (39 claves)
- `messages/es.json` — nuevo namespace `csvImport` (39 claves)
- `src/components/transactions/CSVImportDialog.tsx` — `useTranslations` + 42 llamadas `t()` / 2 llamadas `tc("back")`

**Strings migrados (por step):**

| Step | Strings migrados |
|---|---|
| Upload | título, uploadPrompt, uploadHint, errorMinRows, errorParse |
| Map | rowsDetected, labelAccount, selectAccount, labelDateCol, labelDescCol, labelAmountCol, selectColumn, labelDateFormat, **dateFormatUS, dateFormatLatam, dateFormatISO**, invertSign, errorSelectAccount, errorSelectDate, errorSelectDesc, errorSelectAmount, errorNoValidRows, errorImportFailed, Back, Preview |
| Preview | previewingRows, colDate, colDescription, colAmount, colType, typeIncome, typeExpense, Back, importRows, importing |
| Done | partialImport, importComplete, importedCount, duplicatesSkipped, rerunSafe, transferMatchesSkipped, transferMatchNote, duplicateNote, done |

**Patrón usado:**
```tsx
const t = useTranslations("csvImport");
const tc = useTranslations("common");  // solo para tc("back")
```

**Validación post-cambio:**
- EN = ES = 337 claves totales (sin claves faltantes en ningún idioma)
- `csvImport` namespace: 42 claves en ambos idiomas (incluye `dateFormatUS`, `dateFormatLatam`, `dateFormatISO` agregadas en re-revisión)
- 0 strings hardcodeados en inglés en el componente
- typecheck OK, lint OK

---

## Verificación manual recomendada

1. Cambiar idioma a ES en Topbar (selector EN/ES)
2. Ir a Transactions → Import CSV
3. Step upload: textos en español
4. Subir CSV → step map: labels en español, errores de validación en español
5. Step preview: encabezados de tabla en español, tipo Ingreso/Gasto
6. Step done: "Importación completa", conteos en español
7. Cambiar de vuelta a EN → todos los textos en inglés
8. Notificaciones: severity badge muestra "Información" en ES

---

## Riesgo

**Bajo.** Cambios puramente en capa de presentación — sin lógica de negocio, sin mutaciones Convex, sin cambios de schema. El único riesgo es una clave faltante que causaría que next-intl muestre la clave cruda (ej. `csvImport.title`) — validado: ninguna clave falta.
