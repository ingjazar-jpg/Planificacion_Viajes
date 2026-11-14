SPEC-002 — Gestión de períodos vacacionales y actividades

| Campo | Valor |

| --- | --- |

| Proyecto | Sistema de Planificación y Control de Vacaciones Decembrinas |

| Identificador | SPEC-002 |

| Versión | 0.1 |

| Estado | Aprobada |

| Documento relacionado | SPEC-001 v0.1 |

| Módulos | Períodos vacacionales y actividades |

1. Propósito

Definir los requisitos funcionales y las reglas de negocio para administrar los períodos vacacionales y las actividades planificadas dentro de cada período.

El documento establece cómo se crean los períodos, cómo se registran y administran las actividades y cómo se determina su estado de cumplimiento y vencimiento.

2. Gestión de períodos vacacionales

2.1. Definición

Un período vacacional representa un ciclo independiente de planificación de vacaciones.

Cada año tendrá su propio período, con fechas configurables por el usuario.

Ejemplos:

- Vacaciones 2026.

- Vacaciones 2027.

- Vacaciones 2028.

Los períodos podrán tener fechas diferentes. No estarán limitados obligatoriamente al intervalo del 1 de diciembre al 31 de enero.

2.2. Datos del período

| Campo | Descripción |

| --- | --- |

| ID | Identificador único del período. |

| Año | Año al que corresponde el período. |

| Nombre | Nombre descriptivo del período. |

| Fecha de inicio | Primera fecha del período. |

| Fecha de finalización | Última fecha del período. |

| Fecha de creación | Fecha de registro del período. |

La obligatoriedad de los campos descriptivos y la estrategia de generación de identificadores se detallarán en DATA-001.

2.3. Requisitos funcionales

| ID | Requisito |

| --- | --- |

| RF-PER-001 | El sistema permitirá crear períodos vacacionales independientes por año. |

| RF-PER-002 | El usuario podrá establecer las fechas de inicio y finalización de cada período. |

| RF-PER-003 | El sistema permitirá consultar los períodos registrados. |

| RF-PER-004 | El usuario podrá seleccionar un período para consultar y gestionar su información. |

| RF-PER-005 | El sistema mantendrá independientes las actividades, presupuestos y gastos de cada período. |

| RF-PER-006 | El sistema permitirá consultar períodos anteriores. |

| RF-PER-007 | El sistema validará que la fecha de inicio no sea posterior a la fecha de finalización. |

2.4. Reglas de negocio

- Cada año tendrá un período vacacional independiente.

- Las fechas serán personalizables.

- Los datos de un período no podrán mezclarse con los de otro.

- Las actividades y gastos estarán vinculados a un período.

- El presupuesto será independiente para cada período.

- La consulta de un período anterior no modificará sus registros.

2.5. Restricciones pendientes

Se requiere definir antes de implementar:

- Si se permitirá modificar las fechas de un período después de registrar actividades.

- Si se permitirá eliminar un período.

- Qué sucederá cuando se intente eliminar un período que tenga actividades, presupuesto o gastos.

- Si el nombre del período será obligatorio o se generará automáticamente.

- Si se permitirá más de un período asociado al mismo año.

3. Gestión de actividades

3.1. Definición

Una actividad representa un evento, compromiso, viaje o tarea que forma parte de la planificación de un período vacacional.

Ejemplos:

- Viaje familiar.

- Reserva de alojamiento.

- Visita turística.

- Reunión familiar.

- Actividad recreativa.

- Traslado terrestre.

Cada actividad pertenecerá a un único período vacacional.

3.2. Datos de una actividad

| Campo | Descripción |

| --- | --- |

| ID | Identificador único de la actividad. |

| Período | Período vacacional al que pertenece. |

| Nombre | Nombre de la actividad. |

| Descripción | Información complementaria. |

| Categoría | Clasificación de la actividad. |

| Destino | Lugar donde se realizará, cuando corresponda. |

| Fecha de inicio | Fecha programada de inicio. |

| Fecha de finalización | Fecha programada de finalización. |

| Hora de inicio | Hora programada de inicio. |

| Hora de finalización | Hora programada de finalización. |

| Prioridad | Nivel de importancia. |

| Estado | Situación actual de la actividad. |

| Fecha de creación | Fecha de registro. |

| Fecha de actualización | Última modificación registrada. |

La obligatoriedad de cada campo se definirá en la matriz de validaciones y en DATA-001.

3.3. Categorías permitidas

El sistema dispondrá inicialmente de las siguientes categorías:

| Categoría | Uso |

| --- | --- |

| Viajes | Viajes y desplazamientos vacacionales. |

| Transporte | Traslados y medios de transporte. |

| Alojamiento | Reservas y estadías. |

| Recreación | Actividades de entretenimiento. |

| Turismo | Visitas y recorridos turísticos. |

| Reuniones familiares | Encuentros y celebraciones familiares. |

| Otros | Actividades que no correspondan a las categorías anteriores. |

3.4. Prioridades permitidas

| Prioridad | Descripción |

| --- | --- |

| Alta | Actividad de importancia elevada. |

| Media | Actividad de importancia intermedia. |

| Baja | Actividad de menor prioridad. |

La prioridad permitirá identificar visualmente las actividades que requieren mayor atención.

3.5. Estados permitidos

| Estado | Descripción |

| --- | --- |

| Pendiente | Actividad registrada que todavía no se ha iniciado. |

| En progreso | Actividad cuyo desarrollo ha comenzado. |

| Completada | Actividad realizada. |

| Cancelada | Actividad que no se llevará a cabo. |

Los estados serán utilizados para los indicadores de planificación, cumplimiento, calendario y alertas.

4. Requisitos funcionales de actividades

| ID | Requisito |

| --- | --- |

| RF-ACT-001 | El sistema permitirá registrar actividades dentro de un período vacacional. |

| RF-ACT-002 | El sistema permitirá consultar las actividades de un período seleccionado. |

| RF-ACT-003 | El sistema permitirá consultar el detalle de una actividad. |

| RF-ACT-004 | El sistema permitirá editar la información de una actividad. |

| RF-ACT-005 | El sistema permitirá eliminar definitivamente una actividad. |

| RF-ACT-006 | El sistema permitirá asignar una categoría a cada actividad. |

| RF-ACT-007 | El sistema permitirá asignar una prioridad a cada actividad. |

| RF-ACT-008 | El sistema permitirá gestionar el estado de cada actividad. |

| RF-ACT-009 | El sistema permitirá registrar fechas y horarios de las actividades. |

| RF-ACT-010 | El sistema permitirá registrar un destino cuando corresponda. |

| RF-ACT-011 | El sistema permitirá filtrar las actividades por categoría, prioridad, fecha y estado. |

| RF-ACT-012 | El sistema permitirá consultar actividades próximas y vencidas. |

| RF-ACT-013 | El sistema permitirá identificar actividades completadas y canceladas. |

5. Reglas de negocio de actividades

5.1. Relación con períodos

- Toda actividad deberá pertenecer a un período vacacional.

- Una actividad no podrá pertenecer simultáneamente a varios períodos.

- La información de una actividad deberá aparecer únicamente en las consultas del período al que pertenece.

- Los gastos podrán asociarse a actividades, pero la relación y sus reglas se especificarán en SPEC-004.

5.2. Fechas y horarios

- Las actividades tendrán fecha de inicio y fecha de finalización.

- La fecha de inicio no podrá ser posterior a la fecha de finalización.

- Las actividades podrán comprender un solo día o varios días.

- Se registrarán las horas de inicio y finalización cuando corresponda.

La obligatoriedad de los horarios y las reglas para actividades que atraviesen la medianoche quedan pendientes de definición.

5.3. Estados

El sistema permitirá administrar los cuatro estados definidos.

No se ha establecido todavía una restricción de transiciones entre estados. Por tanto, no se asumirá que una actividad completada o cancelada sea irreversible, ni que pueda reabrirse, hasta definir expresamente esa regla.

5.4. Eliminación

- La eliminación de una actividad será definitiva.

- No existirá papelera de recuperación.

- La eliminación deberá mantener la integridad de los datos relacionados.

- El comportamiento frente a gastos asociados a una actividad eliminada se definirá en SPEC-004.

6. Regla de vencimiento

Una actividad se considerará vencida cuando haya finalizado su fecha programada y continúe en estado Pendiente o En progreso.

| Tipo de actividad | Condición de vencimiento |

| --- | --- |

| Actividad de un día | Al finalizar la fecha programada. |

| Actividad de varios días | Al finalizar la fecha de finalización. |

Reglas complementarias:

- Una actividad completada nunca se considerará vencida.

- Una actividad cancelada nunca se considerará vencida.

- Una actividad pendiente o en progreso podrá considerarse vencida según sus fechas.

- El vencimiento será una condición calculada a partir de las fechas y el estado; no será un estado adicional de la actividad.

- Si una actividad vencida cambia a Completada o Cancelada, dejará de considerarse vencida.

7. Indicadores de actividades

El sistema deberá proporcionar información para calcular:

| Indicador | Descripción |

| --- | --- |

| Total de actividades | Cantidad total de actividades registradas. |

| Pendientes | Cantidad de actividades en estado Pendiente. |

| En progreso | Cantidad de actividades en estado En progreso. |

| Completadas | Cantidad de actividades en estado Completada. |

| Canceladas | Cantidad de actividades en estado Cancelada. |

| Vencidas | Actividades pendientes o en progreso cuya fecha programada ha finalizado. |

| Próximas | Actividades que cumplen la condición temporal de próxima definida en SPEC-003. |

| Cumplimiento | Porcentaje de actividades completadas respecto a las actividades planificadas no canceladas. |

Fórmula aprobada:

[
Cumplimiento =
\frac{Completadas}{Total\ planificadas - Canceladas}
\times 100
]

El tratamiento del denominador igual a cero queda pendiente de definición.

8. Criterios de aceptación

Períodos

- CA-PER-001: Se puede crear un período con fechas personalizadas.

- CA-PER-002: El sistema rechaza un período cuya fecha inicial sea posterior a su fecha final.

- CA-PER-003: Se pueden consultar períodos de años anteriores.

- CA-PER-004: Los datos de diferentes períodos permanecen independientes.

Actividades

- CA-ACT-001: Se puede registrar una actividad dentro de un período.

- CA-ACT-002: La actividad permite registrar los campos definidos en esta especificación.

- CA-ACT-003: Se puede consultar y editar una actividad.

- CA-ACT-004: Se puede eliminar definitivamente una actividad.

- CA-ACT-005: El sistema rechaza fechas de inicio posteriores a las fechas de finalización.

- CA-ACT-006: Las categorías, prioridades y estados se limitan a los valores permitidos.

- CA-ACT-007: Se pueden consultar y filtrar actividades por categoría, prioridad, fecha y estado.

- CA-ACT-008: Las actividades de un día y de varios días se evalúan con la regla de vencimiento correspondiente.

- CA-ACT-009: Las actividades completadas o canceladas nunca aparecen como vencidas.

- CA-ACT-010: Los indicadores reflejan los estados reales de las actividades del período consultado.

9. Dependencias documentales

- SPEC-001: Requisitos funcionales generales.

- SPEC-003: Calendario y alertas.

- SPEC-004: Presupuestos y gastos.

- SPEC-005: Dashboard e informes.

- DATA-001: Modelos y estructura JSON.

- API-001: Contratos de API.

- UI-001: Identidad visual y componentes.

10.Registro de decisiones actualizado

9 de 9 decisiones respondidas

| ID | Decisión | Resultado |

| --- | --- | --- |

| DEC-012 | Períodos por año | Un único período por año. |

| DEC-013 | Modificación de fechas | Bloquear cambios que dejen actividades fuera del nuevo rango. |

| DEC-014 | Fechas de actividades | Deben estar dentro del período. |

| DEC-015 | Horarios | Hora de inicio y finalización obligatorias. |

| DEC-016 | Solapamientos | No se permiten actividades con coincidencia de fecha y horario. |

| DEC-017 | Transiciones de estado | Pendiente → En progreso → Completada. Cancelada desde cualquier estado. |

| DEC-018 | Eliminar actividad con gastos | Eliminar también los gastos asociados. |

| DEC-019 | Cumplimiento sin actividades elegibles | Mostrar 0 %. |

| DEC-020 | Eliminar períodos | No se permite eliminar períodos. |

2. Reglas definitivas incorporadas

Transiciones de estado

Flujo permitido

Pendiente

En progreso

Completada

Cancelada

Permitida desde cualquiera de los tres estados.

No se permitirá regresar de Completada a En progreso ni de En progreso a Pendiente.

Integridad de períodos y actividades

- No se podrá crear más de un período para el mismo año.

- Las fechas de cada actividad deberán estar dentro de las fechas del período.

- Al modificar las fechas del período, el sistema verificará todas las actividades existentes.

- Si alguna queda fuera del nuevo rango, rechazará el cambio.

- No se permitirá eliminar un período.

Solapamiento de actividades

Se impedirá registrar o modificar una actividad cuando coincida temporalmente con otra actividad del mismo período.

La validación deberá considerar tanto las fechas como las horas, incluyendo actividades de varios días.

Eliminación de actividades

La eliminación será definitiva y también eliminará los gastos relacionados con esa actividad. Esta operación deberá ejecutarse de forma consistente para evitar que queden registros incompletos.

DEC-021 — Límites de horarios en actividades

Aprobada

Se permitirá que una actividad comience exactamente a la hora en que termina otra, porque no existe superposición efectiva.

Ejemplo:

| Actividad | Inicio | Finalización |

| --- | --- | --- |

| Actividad A | 08:00 | 10:00 |

| Actividad B | 10:00 | 12:00 |

Válido

La regla técnica será considerar los intervalos como [inicio, finalización): incluye la hora de inicio, pero excluye la hora de finalización.

Esto también se aplicará a actividades de varios días, considerando sus fechas y horarios completos.
