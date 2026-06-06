# Guía de Datos de Prueba — FinTrack

**Fecha base del historial:** abril–junio 2026  
**Usuario de prueba:** cuenta personal (hilario.aellos@gmail.com o cuenta de test)

Sigue estos pasos en orden. Cada sección indica el resultado esperado al terminar.

---

## 1. Settings

- Moneda predeterminada: **MXN**
- Idioma: **Español**

**Resultado esperado:** Dashboard, reportes y widgets muestran montos en MXN por defecto.

---

## 2. Accounts (4 cuentas)

| Nombre | Tipo | Moneda | Saldo inicial |
|---|---|---|---|
| BBVA Nómina | Checking | MXN | 18,500.00 |
| HSBC Ahorros | Savings | MXN | 45,000.00 |
| Visa Platinum | Credit | MXN | -12,300.00 (ingresar como 12,300 — el tipo Credit lo hace negativo) |
| Chase USD | Checking | USD | 1,200.00 |

**Resultado esperado:** 4 cuentas en la lista. Net Worth en dashboard aprox. MX$51,200 + Chase convertido (sin FX real, el selector de moneda muestra cada moneda por separado).

---

## 3. Transactions — historial abril–junio 2026

Crea las siguientes transacciones para cada uno de los 3 meses (abril, mayo, junio 2026). Usa el día indicado.

### Gastos mensuales (cuenta: BBVA Nómina, tipo: Expense, moneda: MXN)

| Concepto | Monto | Día |
|---|---|---|
| Supermercado | 3,200.00 | 3 |
| Gasolina | 1,800.00 | 8 |
| Luz CFE | 850.00 | 10 |
| Agua | 320.00 | 12 |
| Netflix | 219.00 | 15 |
| Gym | 799.00 | 20 |

### Ingresos mensuales (cuenta: BBVA Nómina, tipo: Income, moneda: MXN)

| Concepto | Monto | Día |
|---|---|---|
| Nómina | 18,500.00 | 1 |
| Freelance | 5,000.00 | 15 |

### Transferencia mensual (BBVA Nómina → HSBC Ahorros, tipo: Transfer)

- Monto: 5,000.00 MXN
- Día: 5 de cada mes

### Gastos en USD (cuenta: Chase USD, tipo: Expense)

Crea solo 1 vez (no por mes):

| Concepto | Monto |
|---|---|
| Amazon | 45.99 |
| Notion | 8.00 |

**Resultado esperado:** ~54 transacciones en total. IncomeVsExpenses chart muestra 3 meses de barras. Budget estimate con historial de 3 meses disponible.

---

## 4. Budget — junio 2026

1. Ir a Presupuesto → seleccionar junio 2026
2. Clic en "Estimar del historial" → lookback 3 meses
3. Seleccionar todas las categorías → Apply
4. Verificar que aparecen líneas para cada categoría con promedios de los 3 meses

**Resultado esperado:** 6 categorías con montos estimados basados en el historial. El presupuesto de junio queda configurado automáticamente.

---

## 5. Debts (2 deudas)

| Campo | Deuda 1 | Deuda 2 |
|---|---|---|
| Nombre | Visa Platinum | Crédito Auto |
| Tipo | Revolving | Installment |
| Moneda | MXN | MXN |
| Saldo | 12,300.00 | 180,000.00 |
| TAE (%) | 36.00 | 12.50 |
| Pago mensual | 1,500.00 | 4,500.00 |
| Plazo total | — | 48 meses |
| Cuotas pagadas | — | 6 |
| Día de pago | 20 | 5 |

**Resultado esperado:** 2 tarjetas de deuda. Avalanche ordena Visa Platinum primero (36% > 12.5%). Snowball ordena Visa Platinum primero también (saldo menor). Tabla de amortización visible en Crédito Auto.

---

## 6. Receivables (1 acreencia)

- Deudor: Ana García
- Descripción: Préstamo personal
- Monto original: 3,500.00 MXN
- Fecha origen: 2026-05-01
- Fecha vencimiento: 2026-08-01

**Resultado esperado:** Acreencia aparece como "Active". Total pendiente: MX$3,500.

---

## 7. Gasto compartido

1. Ir a Transacciones → Nueva transacción
2. Tipo: Expense, cuenta: BBVA Nómina, monto: 1,200.00, concepto: Restaurante La Finca
3. Activar "Split this expense with someone"
4. Deudor: Carlos Ruiz, monto compartido: 600.00
5. Guardar

**Resultado esperado:** Transacción de $1,200 MXN creada. En Receivables aparece automáticamente una nueva acreencia de $600 MXN para "Carlos Ruiz".

---

## 8. Subscriptions (3 suscripciones)

| Servicio | Monto | Ciclo | Cuenta |
|---|---|---|---|
| Netflix | 219.00 MXN | Monthly | BBVA Nómina |
| Spotify | 99.00 MXN | Monthly | BBVA Nómina |
| iCloud | 35.00 MXN | Monthly | BBVA Nómina |

**Resultado esperado:** 3 suscripciones activas. Costo mensual total: MX$353.

---

## 9. CSV Import

1. Descarga el estado de cuenta de BBVA en formato CSV (o usa el archivo de ejemplo en Docs/)
2. Ir a Transacciones → Importar CSV
3. Seleccionar archivo
4. En el paso "Map columns": seleccionar formato de fecha **DD/MM/YYYY**
5. Mapear columnas: Fecha, Concepto/Descripción, Monto
6. Preview → verificar que las fechas se ven correctas
7. Importar
8. Importar el mismo archivo de nuevo → verificar que 0 filas se importan (deduplicación)

**Resultado esperado:** Primera importación: X filas importadas, 0 duplicadas. Segunda importación: 0 importadas, todas marcadas como duplicadas.

---

## 10. Reconciliation

1. Ir a Conciliación → seleccionar BBVA Nómina
2. Saldo del banco (del estado de cuenta real): ingresar el saldo real de tu cuenta
3. Fecha: fecha del estado de cuenta
4. Confirmar

**Resultado esperado:**
- Si el saldo coincide: mensaje verde "Records match"
- Si hay diferencia: monto de diferencia en rojo
- El registro aparece en el historial de conciliaciones con la fecha en español

---

## Limpieza post-QA

Cuando termines el QA y quieras empezar con datos reales:
1. Archivar todas las deudas de prueba
2. Archivar todas las suscripciones de prueba
3. Dar de baja las acreencias de prueba
4. Eliminar/archivar las cuentas de prueba o ajustar saldos a cero
5. Las transacciones importadas vía CSV quedarán en el historial — puedes ignorarlas o eliminarlas desde la UI si existe esa opción
