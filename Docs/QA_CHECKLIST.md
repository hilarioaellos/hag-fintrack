# Checklist de QA — FinTrack

**Prerequisito:** Completar TEST_DATA_GUIDE.md antes de ejecutar este checklist.  
**Leyenda:** [SETUP] prerequisito · [VERIFY] resultado esperado · [EDGE] caso límite

---

## Landing Page — Tab FinTrack

- [ ] [VERIFY] Portal privado /private: sección "Apps" visible con tarjeta "FinTrack" (ícono wallet, sin badge "Soon", sin opacidad)
- [ ] [VERIFY] Sidebar: item "FinTrack" aparece entre los módulos activos y la sección Coming Soon
- [ ] [VERIFY] Clic en tarjeta FinTrack → abre fintrack.hagpartner.com en nueva pestaña
- [ ] [VERIFY] "Finance" ya no aparece en la sección Coming Soon
- [ ] [VERIFY] Las otras 5 tabs (Accounting, Suppliers, Documents, Messaging, CRM) siguen con badge "Soon"

---

## Dashboard

- [ ] [SETUP] Estar logueado con el usuario de prueba con datos del TEST_DATA_GUIDE
- [ ] [VERIFY] StatCard "Monthly Income" muestra ingresos del mes actual en MXN
- [ ] [VERIFY] StatCard "Monthly Expenses" muestra gastos del mes actual en MXN
- [ ] [VERIFY] NetWorth muestra valor positivo en verde (suma de cuentas activas en MXN)
- [ ] [VERIFY] Selector de moneda visible (tenemos MXN + USD) — muestra ambas opciones
- [ ] [VERIFY] Cambiar selector a USD → StatCards cambian a valores USD (solo transacciones Chase)
- [ ] [VERIFY] Transacciones recientes muestran las últimas 5 transacciones

---

## Accounts

- [ ] [VERIFY] 4 cuentas visibles: BBVA Nómina, HSBC Ahorros, Visa Platinum, Chase USD
- [ ] [VERIFY] Visa Platinum muestra saldo negativo en rojo
- [ ] [VERIFY] Chase USD muestra saldo en USD con símbolo $
- [ ] [EDGE] Crear cuenta con código de moneda "XX" → error de validación inmediato en frontend
- [ ] [EDGE] Crear cuenta con código "BS" → error de validación inmediato
- [ ] [VERIFY] Editar nombre de cuenta BBVA → cambio se refleja inmediatamente

---

## Transactions

- [ ] [VERIFY] Lista de transacciones muestra historial de 3 meses (abril–junio 2026)
- [ ] [VERIFY] Crear nueva transacción Expense en MXN → aparece en lista
- [ ] [VERIFY] Crear transacción Income → aparece con signo positivo en verde
- [ ] [VERIFY] Toggle "Split this expense" → campos debtorName y sharedAmount visibles
- [ ] [VERIFY] Gasto compartido $1,200 con split $600 a "Carlos Ruiz" → acreencia creada en Receivables
- [ ] [EDGE] Ingresar sharedAmount mayor al total → error de validación

---

## Budget

- [ ] [VERIFY] Presupuesto de junio 2026 muestra 6 categorías con montos estimados
- [ ] [VERIFY] Barra de progreso por categoría muestra % gastado vs planificado
- [ ] [VERIFY] Categoría sin gastos en junio → barra en 0%
- [ ] [VERIFY] "Estimate from history" con lookback 6 meses → funciona (puede tener menos datos)
- [ ] [EDGE] "Estimate from history" con lookback 12 meses y solo 3 meses de data → muestra promedios correctos (no crash)

---

## Debts

- [ ] [VERIFY] 2 deudas visibles: Visa Platinum y Crédito Auto
- [ ] [VERIFY] Estrategia Avalanche → Visa Platinum primero (36% TAE > 12.5%)
- [ ] [VERIFY] Estrategia Snowball → Visa Platinum primero (saldo $12,300 < $180,000)
- [ ] [VERIFY] Crédito Auto tiene barra de progreso: 6/48 cuotas = 12.5%
- [ ] [VERIFY] Tabla de amortización de Crédito Auto → muestra filas de capital e interés
- [ ] [EDGE] Crear 1 deuda en USD → cambiar a Snowball → warning banner "monedas distintas" visible

---

## Receivables

- [ ] [VERIFY] 2 acreencias: Ana García ($3,500) y Carlos Ruiz ($600 — creada por gasto compartido)
- [ ] [VERIFY] Ambas en estado "Active"
- [ ] [VERIFY] Registrar pago parcial de $1,000 a Ana García → estado cambia a "Partially Paid"
- [ ] [VERIFY] Registrar pago del saldo restante → estado cambia a "Fully Paid"

---

## Subscriptions

- [ ] [VERIFY] 3 suscripciones: Netflix $219, Spotify $99, iCloud $35
- [ ] [VERIFY] Costo mensual total: MX$353
- [ ] [VERIFY] "Mark Renewed" en Netflix → fecha de próxima renovación avanza un mes
- [ ] [EDGE] Cancelar una suscripción → desaparece de la lista activa

---

## Reports

- [ ] [SETUP] Asegurar datos de 3 meses completos antes de abrir Reports
- [ ] [VERIFY] Selector de moneda visible (MXN + USD)
- [ ] [VERIFY] IncomeVsExpenses (6 meses): barras verdes (income) y rojas (expenses) visibles para abr–jun
- [ ] [VERIFY] Cambiar selector a USD → solo datos de Chase USD visibles en charts
- [ ] [VERIFY] CategoryPieChart: sectores de colores con % por categoría
- [ ] [VERIFY] Tooltip de chart muestra símbolo correcto (MX$ para MXN, $ para USD)
- [ ] [VERIFY] Eje Y de charts no muestra "$" hardcodeado → usa MX$ o $ según moneda activa
- [ ] [VERIFY] CashFlowChart: tooltip header dice "Día 15" en ES, "Day 15" en EN
- [ ] [VERIFY] NetWorth card muestra patrimonio neto de cuentas MXN activas

---

## CSV Import

- [ ] [SETUP] Tener archivo CSV de banco con fechas en DD/MM/YYYY
- [ ] [VERIFY] Paso "Map columns": selector "Date format" visible con 3 opciones
- [ ] [VERIFY] Seleccionar DD/MM/YYYY → preview muestra fechas correctas (ej. 05/06/2026 = 5 junio)
- [ ] [VERIFY] Importar → resumen muestra "X importadas, Y duplicadas"
- [ ] [VERIFY] Importar mismo CSV de nuevo → 0 importadas, todas como duplicadas
- [ ] [EDGE] CSV con fecha inválida (32/01/2026) → error claro "Row N: Invalid date"

---

## Reconciliation

- [ ] [VERIFY] Selector de cuenta muestra las 4 cuentas
- [ ] [VERIFY] Seleccionar BBVA Nómina → formulario de conciliación visible
- [ ] [VERIFY] Ingresar saldo igual al sistema → mensaje verde "Records match"
- [ ] [VERIFY] Ingresar saldo diferente → diferencia en rojo + monto exacto
- [ ] [VERIFY] Confirmar → aparece en historial con fecha en idioma activo
- [ ] [VERIFY] Historial muestra fecha en español (ej. "jun. 6, 2026") cuando idioma = ES

---

## i18n (Internacionalización)

- [ ] [VERIFY] Cambiar idioma a EN en Settings → toda la UI en inglés
- [ ] [VERIFY] Volver a ES → toda la UI en español
- [ ] [VERIFY] Errores de validación en Debts aparecen en el idioma activo
- [ ] [VERIFY] Errores de validación en Reconciliation en el idioma activo
- [ ] [VERIFY] Badge de severidad en notificaciones: "Urgente" en ES, "Urgent" en EN

---

## Notifications

- [ ] [VERIFY] Icono de campana muestra badge con número si hay notificaciones no leídas
- [ ] [VERIFY] Abrir panel → notificaciones muestran mensaje en idioma activo
- [ ] [VERIFY] "Marcar todo leído" → badge desaparece
- [ ] [VERIFY] aria-label del botón es "Notificaciones" en ES

---

## Resultado final

Todos los items [VERIFY] deben pasar sin errores antes de proceder a Fase 2 (usuarios reales).  
Documentar cualquier [EDGE] que falle con captura de pantalla y descripción del error.
