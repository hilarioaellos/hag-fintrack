# FinTrack — Manual de Usuario

**Tu app de finanzas personales**
`fintrack.hagpartner.com`

---

## Primeros pasos

### Acceder a FinTrack

1. Recibirás un correo de invitación — sigue el link para crear tu contraseña en hagpartner.com
2. Una vez creada, entra directamente a **fintrack.hagpartner.com**
3. Usa el mismo correo y contraseña que registraste

> Tu información es privada. Solo tú ves tus datos.

---

## Configuración inicial (5 minutos)

Antes de empezar, configura lo básico en **Configuración** (ícono de engranaje en el menú lateral):

- **Moneda predeterminada** — selecciona MXN, USD u otra según tus cuentas principales
- **Tema** — claro, oscuro o automático
- **Idioma** — cambia entre ES y EN desde el selector en la barra superior

### Categorías personalizadas

En Configuración → **Preferencias de Categorías** puedes:

- Activar o desactivar categorías para que aparezcan en formularios y reportes
- Excluir categorías de reportes (útil para transferencias internas)
- **Crear categorías propias:** botón "＋ Nueva categoría" → escribe el nombre, elige un emoji y un color
- **Editar:** ícono ✏️ junto a cualquier categoría custom → cambia nombre, emoji o color
- **Eliminar:** ícono 🗑️ → confirma para borrar (las transacciones existentes conservarán su monto, solo perderán la categoría)

Las categorías del sistema (Groceries, Salary, etc.) no se pueden eliminar.

---

## Módulos

### 1. Cuentas
*Menú → Cuentas*

Registra todas tus cuentas bancarias, de efectivo e inversión.

**Crear una cuenta:**
1. Botón **+ Agregar Cuenta**
2. Elige el tipo: Cheques, Ahorros, Crédito, Inversión o Efectivo
3. Ingresa el nombre (ej. "BBVA Nómina"), banco y saldo inicial
4. Elige la moneda de esa cuenta

**Cuenta de tipo Crédito — datos adicionales:**
Al seleccionar "Crédito" aparece automáticamente una sección de datos de tarjeta:
- Día de cierre (1–28)
- Día de pago (1–28)
- Límite de crédito
- Pago mínimo

Estos datos se guardan junto con la cuenta en un solo paso.

> El saldo se actualiza automáticamente cada vez que registras una transacción.

---

### 2. Transacciones
*Menú → Transacciones*

El corazón de la app. Registra cada ingreso, gasto o transferencia.

**Agregar una transacción:**
1. Botón **+ Agregar Transacción**
2. Selecciona el tipo: **Ingreso**, **Gasto** o **Transferencia**
3. Elige la cuenta, categoría, monto y fecha
4. Guarda

**Gasto compartido:** si dividiste un gasto con alguien, activa "Dividir gasto" — ingresa el nombre de la persona y su parte. Se crea automáticamente una acreencia por el monto que te deben.

**Importar desde CSV:**
- Exporta el estado de tu banco directamente desde el portal — sin modificar el archivo
- En Transacciones → **Importar CSV**
- Paso 1: carga el archivo → la app detecta automáticamente el formato del banco y pre-configura las columnas
- Paso 2: selecciona la cuenta destino → revisa el mapeo detectado (puedes ajustarlo si es necesario)
- Paso 3: verifica el preview de las primeras 5 filas y confirma
- Las filas duplicadas se omiten automáticamente — es seguro importar el mismo CSV dos veces

**Bancos detectados automáticamente:** Capital One, American Express, Chase, Citi, Bank of America. Para otros bancos el sistema muestra un aviso y permite mapear las columnas manualmente.

> El saldo inicial de la cuenta debe ser el saldo real al momento de crear la cuenta. El CSV agrega el historial de movimientos encima de ese saldo — no lo reemplaza.

---

### 3. Dashboard
*Menú → Dashboard*

Vista rápida del estado actual de tus finanzas:

- **Patrimonio Neto** — suma de todos tus activos menos deudas
- **Ingresos del mes** — total de ingresos en el mes seleccionado
- **Gastos del mes** — total de gastos en el mes seleccionado
- **Flujo de caja** — diferencia entre ingresos y gastos

**Navegar por meses:** usa las flechas ← → bajo el encabezado para ver datos de meses anteriores. Los widgets de ingresos, gastos y flujo se actualizan para reflejar el período seleccionado.

---

### 4. Presupuesto
*Menú → Presupuesto*

Planifica cuánto quieres gastar por categoría cada mes.

**Crear presupuesto:**
- **Manual:** botón + → elige categoría y monto límite
- **Desde historial:** botón "Estimar del historial" → calcula el promedio de tus gastos reales de los últimos 3, 6 o 12 meses → selecciona las categorías que quieras aplicar

La barra de progreso muestra cuánto llevas gastado vs. lo planificado en tiempo real.

> Tip: usa "Estimar del historial" después de tener al menos 3 meses de transacciones registradas para obtener estimaciones precisas.

---

### 5. Deudas
*Menú → Deudas*

Registra y da seguimiento a tus créditos y deudas.

**Tipos:**
- **Revolvente** — tarjeta de crédito, línea de crédito
- **A plazos** — crédito auto, hipoteca, préstamo personal

Incluye tasa de interés (TAE), pago mensual y día de pago. La app genera la **tabla de amortización** y te sugiere el orden óptimo de pago (método avalancha o bola de nieve).

> Si tienes deudas en distintas monedas, el comparador de métodos trabaja por separado para cada moneda.

---

### 6. Acreencias
*Menú → Acreencias*

Rastrea el dinero que otros te deben.

1. Agrega el nombre del deudor, monto original y fecha de vencimiento
2. Cuando recibes un pago parcial, usa **Registrar Pago**
3. Cuando se liquida, el estado cambia a "Cobrada" automáticamente
4. Si no te van a pagar, usa **Dar de Baja**

---

### 7. Suscripciones
*Menú → Suscripciones*

Controla tus pagos recurrentes (streaming, software, membresías).

- Agrega el servicio, monto, cuenta de cobro y ciclo (mensual, trimestral, anual)
- La app te notifica cuando una suscripción está próxima a renovarse
- Cuando se renueva, haz clic en **Marcar Renovada** para actualizar la próxima fecha

---

### 8. Reportes
*Menú → Reportes*

Cuatro vistas para entender tus finanzas:

**Ingresos vs Gastos**
Barras comparativas de los últimos 6 meses. Haz clic en una barra para ver el detalle.

**Gastos por Categoría**
Pie chart del mes seleccionado (navega con las flechas ← →). **Haz clic en un sector o en la leyenda** para ver el desglose de transacciones de esa categoría en ese mes — montos, fechas y descripción. Haz clic en X para cerrar el detalle.

**Flujo de Caja Diario**
Barras día a día del mes. Útil para identificar días de gasto elevado.

**Patrimonio Neto — evolución**
Número actual del patrimonio neto + gráfica de línea de los últimos 12 meses. La línea de referencia en 0 permite ver de un vistazo si tu patrimonio neto ha sido positivo o negativo a lo largo del tiempo.

> Si tienes cuentas en varias monedas, usa el selector de moneda en la esquina superior derecha para filtrar todos los reportes.

---

### 9. Conciliación
*Menú → Conciliación*

Verifica que tu saldo en la app coincide con tu estado de cuenta bancario.

1. Selecciona la cuenta
2. Ingresa el saldo del estado de cuenta y la fecha de corte
3. La app compara y muestra si hay diferencia o si todo cuadra

---

## Notificaciones

El ícono de campana 🔔 en la barra superior muestra alertas automáticas:

- **Suscripciones próximas a vencer** — aviso con días de anticipación
- **Deudas con pago próximo** — recordatorio antes del día de pago

Marca todas como leídas con el botón "Marcar todas leídas".

---

## Preguntas frecuentes

**¿Puedo usar la app en varios idiomas?**
Sí. Cambia entre Español e Inglés con el selector EN/ES en la barra superior — se aplica de inmediato sin recargar.

**¿Mis datos son seguros?**
Sí. Cada usuario tiene acceso solo a sus propios datos. La app usa autenticación segura y los datos se almacenan en infraestructura de Convex.

**¿Puedo usar MXN y USD al mismo tiempo?**
Sí. Cada cuenta tiene su propia moneda. En Reportes y Dashboard puedes filtrar por moneda para ver tus números en cada una por separado.

**¿Qué pasa si importo el mismo CSV dos veces?**
Las filas duplicadas se detectan automáticamente y se omiten. No hay riesgo de doble conteo.

**¿Cómo borro todos mis datos y empezar de cero?**
Configuración → Zona de Riesgo → **Borrar todos los datos**. El sistema te pedirá escribir una palabra de confirmación. Esta acción es irreversible — conserva solo tus preferencias de idioma y moneda.

**¿Cómo activo el modo oscuro?**
Configuración → Tema → Oscuro (o Automático para seguir la configuración del sistema operativo).

---

## Contacto

Si encuentras algún problema o tienes sugerencias, escríbeme directamente.

---

*FinTrack v1.5 — HAG Partner*

---
---

# GUIÓN — Video de demostración FinTrack

**Duración estimada:** 12–15 minutos
**Tono:** conversacional, directo, sin tecnicismos
**Formato sugerido:** screencast con narración en voz. Mostrar la pantalla en todo momento, no slides.

---

## ANTES DE GRABAR

- Tener datos de ejemplo listos: al menos 2 cuentas (una cheques USD, una crédito USD), 15–20 transacciones de los últimos 2 meses, 1 presupuesto, 1 deuda, 1 suscripción, 1 acreencia
- Tener un CSV de Chase o BOFA descargado listo para el demo de importación (no modificarlo)
- App abierta en fintrack.hagpartner.com, modo oscuro, idioma Español
- Resolución: 1920×1080 mínimo
- Grabar en Chrome o Edge, sin extensiones visibles, barra de bookmarks oculta

---

## SEGMENTO 1 — Introducción (0:00 – 0:45)

**[Pantalla: Dashboard]**

> "FinTrack es una app de finanzas personales diseñada para darte claridad sobre tu dinero — cuánto entra, cuánto sale, cuánto debes y hacia dónde va.
>
> En este video te muestro cómo usar cada módulo desde cero. Vamos a recorrer la app completa en menos de 15 minutos."

*Desplaza el cursor lentamente por el menú lateral para que el espectador vea las secciones.*

---

## SEGMENTO 2 — Acceso y configuración (0:45 – 2:00)

**[Pantalla: Pantalla de Sign In → Dashboard]**

> "El acceso es con el correo y contraseña que creaste al aceptar la invitación. Una vez dentro llegas al Dashboard."

**[Pantalla: Configuración]**

> "Lo primero que haces es configurar tu moneda predeterminada — yo uso MXN — y el tema. Yo prefiero el modo oscuro.
>
> El idioma lo cambias desde este selector arriba. La app está completamente disponible en Español e Inglés."

*Cambia idioma a EN y de vuelta a ES para demostrar.*

> "Cualquier cambio aquí se aplica de inmediato."

---

## SEGMENTO 3 — Cuentas (2:00 – 4:00)

**[Pantalla: Módulo Cuentas]**

> "Todo parte de registrar tus cuentas. Aquí están las mías — una cuenta de cheques en BBVA y una tarjeta de crédito Visa."

*Muestra las tarjetas de cuenta existentes.*

> "Para agregar una cuenta, clic aquí."

**[Abrir dialog + Agregar Cuenta]**

> "Elijo el tipo — en este caso Cheques — le pongo el nombre, el banco y el saldo inicial. La moneda la fijo en MXN.
>
> Si el tipo es Crédito, la app me pide datos adicionales de la tarjeta: el día de cierre, el día de pago, el límite y el pago mínimo. Todo en un solo formulario."

*Selecciona "Crédito" para que aparezcan los campos extra — mostrar en pantalla unos segundos.*

> "El saldo de cada cuenta se actualiza solo conforme registras transacciones. No tienes que calcularlo manualmente."

---

## SEGMENTO 4 — Transacciones (4:00 – 6:30)

**[Pantalla: Módulo Transacciones]**

> "Las transacciones son el corazón de la app. Cada gasto, ingreso o transferencia que registras actualiza el saldo de la cuenta correspondiente."

**[Agregar transacción — Gasto]**

> "Agrego un gasto: selecciono la cuenta, la categoría — en este caso Groceries —, el monto y la fecha. Guardo."

*Mostrar que el registro aparece en la lista.*

> "Si dividí un gasto con alguien — por ejemplo una cena — activo esta opción aquí. Le pongo el nombre de la persona y su parte del gasto. La app crea automáticamente una acreencia para rastrear lo que me deben."

**[Mostrar la opción de gasto compartido brevemente]**

> "Para importar transacciones directamente desde el banco, uso el botón Importar CSV. Solo cargo el archivo tal como lo descargué — sin abrirlo, sin modificarlo."

**[Abrir el dialog de CSV, cargar el archivo preparado]**

> "La app reconoce automáticamente el formato — aquí me dice 'Detectado: Chase' y ya configuró todas las columnas por mí. Solo selecciono la cuenta y veo el preview."

*Mostrar el banner verde de detección y el preview con 5 filas. No hace falta completar la importación.*

> "Las filas duplicadas se omiten automáticamente, así que puedo importar el mismo archivo varias veces sin riesgo."

---

## SEGMENTO 5 — Dashboard (6:30 – 7:30)

**[Pantalla: Dashboard]**

> "El Dashboard me da un resumen inmediato. Veo mi patrimonio neto, los ingresos y gastos del mes y el flujo de caja.
>
> Puedo navegar por meses con estas flechas. Si quiero ver cómo estaba en enero, hago clic hacia atrás y todos los números se actualizan."

*Navegar 2 meses atrás y volver.*

> "El patrimonio neto muestra el saldo actual incluyendo todas mis cuentas — los activos menos las deudas de crédito."

---

## SEGMENTO 6 — Presupuesto (7:30 – 8:45)

**[Pantalla: Módulo Presupuesto]**

> "El presupuesto me permite fijar un límite de gasto por categoría para el mes. Puedo crearlo manualmente o usar el historial."

**[Clic en "Estimar del historial"]**

> "Con 'Estimar del historial' la app calcula el promedio de lo que he gastado en cada categoría en los últimos meses. Selecciono las categorías que me interesan y listo — tengo un presupuesto basado en mi comportamiento real."

*Mostrar la barra de progreso de una categoría que tenga gastos registrados.*

> "La barra de progreso se llena en tiempo real. Cuando me acerco al límite lo veo de inmediato."

---

## SEGMENTO 7 — Reportes (8:45 – 10:30)

**[Pantalla: Módulo Reportes]**

> "Los reportes me ayudan a entender patrones en mis finanzas."

**[Ingresos vs Gastos]**

> "Aquí veo los últimos 6 meses comparando ingresos y gastos mes a mes. De un vistazo sé si estoy gastando más de lo que entra."

**[Gastos por Categoría]**

> "El pie chart me muestra en qué categorías se va mi dinero este mes. Puedo navegar meses con las flechas.
>
> Y aquí viene algo útil — si hago clic en una categoría, veo exactamente qué transacciones la componen: montos, fechas, todo. Para cerrar el detalle, clic en la X."

*Hacer clic en un sector del pie chart y mostrar el panel de detalle.*

**[Patrimonio Neto]**

> "Esta sección es nueva. Además del número actual, tengo una gráfica de los últimos 12 meses que me muestra cómo ha evolucionado mi patrimonio. La línea punteada en cero me indica si en algún momento estuve en negativo."

*Apuntar con el cursor a la línea del chart.*

> "Si tengo cuentas en dólares y pesos, uso este selector de moneda para ver los reportes de cada una por separado."

---

## SEGMENTO 8 — Deudas y Suscripciones (10:30 – 12:00)

**[Pantalla: Módulo Deudas]**

> "En Deudas registro mis créditos. Le doy la tasa de interés, el monto original, el pago mensual y el día de pago. La app calcula la tabla de amortización completa — cuánto va a capital, cuánto a intereses, en cuántos meses termino de pagar."

*Mostrar la tabla de amortización de una deuda existente.*

> "Si tengo varias deudas, la app me sugiere en qué orden pagarlas para minimizar intereses — método avalancha — o para eliminar deudas rápido — método bola de nieve."

**[Pantalla: Módulo Suscripciones]**

> "Las suscripciones son los pagos recurrentes — Netflix, Spotify, iCloud. Registro el monto y la fecha de renovación. La app me avisa cuando se acercan."

---

## SEGMENTO 9 — Categorías personalizadas y Configuración avanzada (12:00 – 13:15)

**[Pantalla: Configuración → Preferencias de Categorías]**

> "En Configuración tengo control total sobre las categorías. Puedo activar o desactivar las que uso — las inactivas no aparecen en los formularios ni en los reportes.
>
> Y puedo crear las mías propias. Clic en Nueva categoría, le pongo un nombre, un emoji y un color. Lista. La puedo editar o borrar cuando quiera."

*Crear una categoría de ejemplo y borrarla.*

> "Las categorías del sistema no se pueden eliminar, pero sí desactivar."

---

## SEGMENTO 10 — Cierre (13:15 – 14:00)

**[Pantalla: Dashboard]**

> "Eso es FinTrack. Una app pensada para que tengas claridad real sobre tus finanzas sin complicaciones.
>
> Cuentas, transacciones, presupuesto, deudas, acreencias, suscripciones y reportes — todo en un solo lugar, disponible en español e inglés.
>
> Si tienes alguna duda o sugerencia, escríbeme directamente. Nos vemos."

*Dejar el Dashboard en pantalla 3 segundos antes de cortar.*

---

## NOTAS DE PRODUCCIÓN

| Segmento | Tiempo | Duración | Acción clave a mostrar |
|---|---|---|---|
| 1. Intro | 0:00 | 0:45 | Recorrido visual del menú lateral |
| 2. Acceso y config | 0:45 | 1:15 | Sign in → moneda/tema/idioma |
| 3. Cuentas | 2:00 | 2:00 | Crear cuenta cheques + mostrar campos credit inline |
| 4. Transacciones | 4:00 | 2:45 | Agregar gasto + gasto compartido + CSV auto-detectado |
| 5. Dashboard | 6:45 | 1:00 | MonthNav navegando meses |
| 6. Presupuesto | 7:45 | 1:15 | Estimar del historial + barra progreso en tiempo real |
| 7. Reportes | 9:00 | 1:45 | Pie drill-down click + net worth chart 12 meses |
| 8. Deudas + Subs | 10:45 | 1:30 | Tabla de amortización + lista suscripciones |
| 9. Categorías | 12:15 | 1:00 | Crear/editar/borrar categoría custom |
| 10. Cierre | 13:15 | 0:45 | Dashboard final |
| **Total** | | **~14 min** | |

**Edición recomendada:**
- Agrega texto en pantalla para los nombres de cada sección al entrar ("Módulo: Transacciones", etc.)
- Resalta con zoom o highlight el banner verde de detección de banco en el segmento CSV
- Agrega lower-third con la URL `fintrack.hagpartner.com` al final
- Música de fondo suave, -18dB bajo la voz

**Tomas que conviene pre-grabar por separado si algo falla:**
- CSV import (segmento 4 — depende de archivo externo)
- Amortización de deuda (segmento 8 — requiere datos cargados)
