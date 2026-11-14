# DATA-001 — Modelo de datos y estructura JSON

**Proyecto:** Sistema de Planificación y Control de Vacaciones Decembrinas  
**Versión:** 0.2  
**Estado indicado en el documento fuente:** Aprobada
**Documentos relacionados:** SPEC-001, SPEC-002, SPEC-003, SPEC-004, SPEC-005, SPEC-006 y ARCH-001.

---

## 1. Propósito

Definir el modelo de datos, las entidades, sus atributos, relaciones, restricciones de integridad y la estructura del archivo JSON utilizado por el sistema.

Este documento constituye la referencia para implementar los modelos Pydantic, las validaciones del backend y la persistencia local.

## 2. Decisiones aprobadas

| ID | Decisión | Regla |
|---|---|---|
| DATA-DEC-001 | Identificadores | UUID para todas las entidades |
| DATA-DEC-002 | Importes | Cadenas decimales en JSON y Decimal en backend |
| DATA-DEC-003 | Períodos multianuales | Se permiten períodos que atraviesan dos años calendario. year corresponde al año de inicio |
| DATA-DEC-004 | Eliminación de gastos | Eliminar también todo su historial de modificaciones |
| DATA-DEC-005 | Persistencia de alertas | Un registro por actividad y tipo de alerta, con historial de eventos |
| DATA-DEC-006 | Versionado JSON | Incluir schema_version, inicialmente "1.0" |
| DATA-DEC-007 | Precisión monetaria | Hasta dos posiciones decimales |
| DATA-DEC-008 | Zona horaria | America/Bogota |

## 3. Convenciones generales

### 3.1 Identificadores

- Todas las entidades tendrán un identificador UUID.
- Los identificadores serán únicos dentro del archivo de datos.
- Las relaciones entre entidades utilizarán los UUID correspondientes.
- El backend será responsable de generar y validar los identificadores.

### 3.2 Fechas y horas

| Tipo | Representación |
|---|---|
| Fecha | YYYY-MM-DD |
| Hora | HH:MM |
| Fecha y hora de auditoría | ISO 8601 con zona horaria |

Los registros de auditoría utilizarán la zona horaria America/Bogota.

Ejemplo:

`2026-11-13T18:30:00-05:00`

### 3.3 Importes monetarios

- Moneda: COP.
- Los importes se almacenarán en JSON como cadenas decimales.
- El backend convertirá las cadenas a Decimal para realizar operaciones.
- Se permitirá una precisión máxima de dos posiciones decimales.
- Los importes deberán ser representados sin separadores de miles.
- Los importes de presupuestos podrán ser cero o positivos.
- Los gastos deberán ser mayores que cero.

Ejemplos:

- `"150000"`
- `"150000.50"`
- `"0.00"`

No se utilizarán números de punto flotante para realizar cálculos monetarios.

### 3.4 Campos opcionales

Los campos opcionales sin valor se representarán como null en JSON.

### 3.5 Auditoría

Las entidades que requieran seguimiento de creación o modificación incluirán sus correspondientes marcas de tiempo.

Las fechas de auditoría no reemplazan las fechas propias de las actividades, los períodos o los gastos.

## 4. Entidades del sistema

### 4.1 Period

Representa un período de vacaciones decembrinas.

**Atributos:**

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| year | Integer | Año correspondiente a la fecha inicial |
| name | String | Nombre del período |
| start_date | Date | Fecha inicial |
| end_date | Date | Fecha final |
| created_at | DateTime | Fecha de creación |

**Reglas:**

1. Solo puede existir un período por año identificado por year.
2. year debe corresponder al año calendario de start_date.
3. La fecha inicial debe ser anterior o igual a la fecha final.
4. Se permiten períodos que atraviesen dos años calendario.
5. No se permite eliminar períodos.
6. Las actividades deben permanecer dentro del rango de fechas del período.
7. Modificar las fechas del período no debe dejar actividades fuera del nuevo rango.

**Ejemplo de período multianual:**

- year: 2026
- name: Vacaciones Decembrinas 2026
- start_date: 2026-12-20
- end_date: 2027-01-10

### 4.2 Activity

Representa una actividad planificada dentro de un período.

**Atributos:**

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| period_id | UUID | Período al que pertenece |
| name | String | Nombre de la actividad |
| description | String / null | Descripción opcional |
| category | Enum | Categoría |
| destination | String / null | Destino opcional |
| start_date | Date | Fecha inicial |
| end_date | Date | Fecha final |
| start_time | Time | Hora inicial |
| end_time | Time | Hora final |
| priority | Enum | Prioridad |
| status | Enum | Estado |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Fecha de última actualización |

**Categorías permitidas:**

- Viajes
- Transporte
- Alojamiento
- Recreación
- Turismo
- Reuniones familiares
- Otros

**Prioridades:**

- Alta
- Media
- Baja

**Estados:**

- Pendiente
- En progreso
- Completada
- Cancelada

**Reglas:**

1. Toda actividad debe pertenecer a un período existente.
2. Las fechas deben estar dentro del rango del período.
3. La fecha inicial debe ser anterior o igual a la fecha final.
4. Las horas de inicio y finalización son obligatorias.
5. No se permiten solapamientos entre actividades.
6. Se permite que una actividad comience exactamente cuando otra termina.
7. Los intervalos se interpretan como [inicio, finalización).
8. Las transiciones de estado deben respetar SPEC-002.
9. El vencimiento es un valor derivado, no se almacena como atributo.
10. Eliminar una actividad elimina también sus gastos asociados y sus alertas e historial.

### 4.3 Alert

Representa una alerta asociada a una actividad.

Cada registro corresponde a una combinación única de actividad y tipo de alerta.

**Atributos:**

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| activity_id | UUID | Actividad asociada |
| type | Enum | Tipo de alerta |
| status | Enum | Estado de revisión |
| condition_active | Boolean | Indica si la condición que origina la alerta sigue vigente |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Fecha de última actualización |
| reviewed_at | DateTime / null | Fecha de revisión |
| history | Array | Historial de eventos de la alerta |

**Tipos de alerta:**

- Próxima
- Vencida
- Prioridad alta

**Estados:**

- Pendiente
- Revisada

**Estructura de los eventos del historial:**

| Campo | Tipo | Descripción |
|---|---|---|
| event_type | Enum | Tipo de evento |
| occurred_at | DateTime | Fecha y hora del evento |

**Tipos de evento:**

- created
- activated
- reviewed
- deactivated
- reactivated

**Reglas:**

1. Una alerta pertenece a una actividad existente.
2. Solo puede existir un registro por actividad y tipo de alerta.
3. La evaluación de condiciones se realiza al abrir la aplicación y cuando cambian los datos que afectan la alerta.
4. Cuando la condición desaparece, se desactiva la alerta sin eliminar su historial.
5. Si la condición vuelve a cumplirse, se recupera el registro anterior.
6. Si la alerta ya estaba Revisada, conserva ese estado al reactivarse.
7. La reactivación no debe crear una nueva alerta ni devolverla a pendientes si estaba Revisada.
8. Una alerta marcada como Revisada deja de mostrarse entre las pendientes.
9. Eliminar una actividad elimina todas sus alertas y sus historiales.
10. No se ejecutan procesos permanentes en segundo plano ni se utilizan servicios externos de notificación.

### 4.4 Budget

Representa el presupuesto asociado a un período.

**Atributos:**

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| period_id | UUID | Período asociado |
| total_budget | Decimal | Presupuesto general |
| category_budgets | Array | Asignaciones por categoría |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Fecha de actualización |

**Estructura de cada asignación por categoría:**

| Campo | Tipo | Descripción |
|---|---|---|
| category | Enum | Categoría presupuestaria |
| amount | Decimal | Importe asignado |

**Categorías permitidas:**

- Viajes
- Transporte
- Alojamiento
- Recreación
- Turismo
- Reuniones familiares
- Otros

**Reglas:**

1. Solo puede existir un presupuesto por período.
2. El presupuesto debe pertenecer a un período existente.
3. El presupuesto general no puede ser negativo.
4. Las asignaciones por categoría no pueden ser negativas.
5. La suma de asignaciones por categoría no puede superar el presupuesto general.
6. Las categorías presupuestarias deben coincidir con las categorías definidas en SPEC-004.
7. Los gastos pueden superar los presupuestos, generando advertencias y sin bloquear su registro.
8. Las modificaciones presupuestarias deben respetar las reglas de consistencia de SPEC-004.
9. Los indicadores derivados no se almacenan como datos independientes.

### 4.5 Expense

Representa un gasto registrado dentro de un período.

**Atributos:**

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| period_id | UUID | Período asociado |
| concept | String | Concepto obligatorio |
| description | String / null | Descripción opcional |
| amount | Decimal | Importe del gasto |
| date | Date | Fecha del gasto |
| category | Enum | Categoría presupuestaria |
| activity_id | UUID / null | Actividad asociada, opcional |
| observations | String / null | Observaciones opcionales |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Fecha de última actualización |

**Reglas:**

1. Todo gasto pertenece a un período existente.
2. El concepto es obligatorio.
3. El importe debe ser mayor que cero.
4. La fecha es obligatoria.
5. La categoría es obligatoria.
6. La categoría debe pertenecer al catálogo presupuestario.
7. La actividad asociada es opcional.
8. Un gasto puede asociarse a cualquier actividad del sistema, sin exigir coincidencia entre su categoría y la categoría de la actividad.
9. Una actividad puede tener varios gastos sin límite predefinido.
10. Todos los campos del gasto pueden editarse.
11. Eliminar un gasto es definitivo.
12. Eliminar una actividad elimina todos los gastos asociados.
13. La edición y eliminación deben mantener la consistencia de los cálculos presupuestarios.

### 4.6 ExpenseHistory

Representa el historial de modificaciones de un gasto.

**Atributos:**

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador único |
| expense_id | UUID | Gasto asociado |
| modification_type | Enum | Tipo de modificación |
| previous_values | Object / null | Valores anteriores |
| new_values | Object / null | Valores nuevos |
| modified_at | DateTime | Fecha de modificación |

**Tipos de modificación:**

- Creación
- Edición

**Reglas:**

1. El historial identifica el gasto al que corresponde.
2. Se registran los valores anteriores y nuevos de las modificaciones.
3. La fecha de modificación debe incluir la zona horaria.
4. Cuando se elimina un gasto, se elimina también todo su historial.
5. Eliminar una actividad elimina los gastos asociados y, por consecuencia, sus historiales.

## 5. Relaciones entre entidades

| Entidad principal | Relación | Entidad relacionada |
|---|---|---|
| Period | Uno a muchos | Activity |
| Period | Uno a uno opcional | Budget |
| Period | Uno a muchos | Expense |
| Activity | Uno a muchos | Alert |
| Activity | Uno a muchos | Expense |
| Alert | Uno a muchos | Eventos de historial |
| Expense | Uno a muchos | ExpenseHistory |

Las relaciones deben validarse desde el backend.

No se permiten referencias a identificadores inexistentes.

## 6. Estructura del archivo JSON

**Archivo principal:** `datos_vacaciones.json`

**Estructura propuesta:**

```json
{
  "schema_version": "1.0",
  "metadata": {
    "created_at": "2026-11-13T18:30:00-05:00",
    "updated_at": "2026-11-13T18:30:00-05:00"
  },
  "periods": [],
  "activities": [],
  "alerts": [],
  "budgets": [],
  "expenses": [],
  "expense_history": []
}
```

Los importes se serializarán como cadenas decimales. Los UUID se representarán como cadenas. Las fechas y horas seguirán las convenciones definidas en este documento.

## 7. Datos derivados

Los siguientes valores se calculan a partir de los registros almacenados y no se mantienen como datos independientes:

- Días restantes de una actividad.
- Estado de vencimiento de una actividad.
- Total de gastos por período.
- Total de gastos por categoría.
- Total de gastos por actividad.
- Saldo general.
- Saldo por categoría.
- Porcentaje de ejecución presupuestaria.
- Porcentaje de cumplimiento.
- Cantidad de actividades por estado.
- Cantidad de actividades vencidas.
- Indicadores del dashboard e informes.

Las fórmulas y reglas de cálculo se mantienen conforme a SPEC-001, SPEC-002, SPEC-004 y SPEC-005.

## 8. Integridad y persistencia

El backend será el único responsable de leer, validar, modificar y guardar el archivo JSON.

Se deben respetar las siguientes condiciones:

1. Validar la estructura y los tipos de datos antes de aceptar cambios.
2. Validar referencias entre entidades.
3. Evitar identificadores duplicados.
4. Evitar registros huérfanos.
5. Aplicar escritura atómica.
6. Utilizar archivo temporal durante las escrituras.
7. Validar el contenido antes de reemplazar el archivo principal.
8. Crear respaldo previo a cada escritura.
9. Mantener el mecanismo de respaldos semanales y retención de 15 copias conforme a SPEC-006 y ARCH-001.
10. Bloquear escrituras ante detección de corrupción del JSON y ofrecer recuperación conforme a SPEC-006.
11. Mantener control de concurrencia para evitar pérdida o sobrescritura de datos.
12. No enviar información a servicios externos.

## 9. Compatibilidad con documentos aprobados

Este modelo respeta las reglas aprobadas en:

- SPEC-001: alcance y requisitos generales.
- SPEC-002: períodos, actividades, estados y validaciones.
- SPEC-003: alertas, historial y reevaluación.
- SPEC-004: presupuestos, gastos y modificaciones.
- SPEC-005: dashboard, informes y datos históricos.
- SPEC-006: requisitos no funcionales, respaldos, recuperación y persistencia.
- ARCH-001: arquitectura por capas y responsabilidad exclusiva del backend sobre JSON.

Cuando se implementen los modelos Pydantic, las validaciones de dominio deberán respetar estas reglas y no duplicar datos derivados innecesariamente.

## 10. Criterios de aceptación

DATA-001 se considerará aprobado cuando:

1. Todas las entidades y sus atributos estén definidos.
2. Los identificadores y relaciones estén especificados.
3. Las reglas de integridad estén documentadas.
4. Las reglas de fechas, horas y zona horaria estén definidas.
5. La representación y precisión monetaria estén establecidas.
6. El comportamiento del historial de gastos y alertas esté definido.
7. La estructura JSON esté documentada.
8. El versionado del archivo esté definido.
9. Las reglas de persistencia sean coherentes con ARCH-001 y SPEC-006.
10. No existan contradicciones con las especificaciones aprobadas.

---

## Observaciones del documento fuente

Hay un punto que conviene verificar: en el modelo de ExpenseHistory se definieron los tipos de modificación como Creación y Edición, mientras que la eliminación borra el gasto y su historial. Esto es coherente con tu decisión DATA-DEC-004.

También se han mantenido los campos de auditoría en las entidades sin introducir reglas nuevas sobre longitudes máximas, nombres únicos o límites de registros que todavía no se han decidido.