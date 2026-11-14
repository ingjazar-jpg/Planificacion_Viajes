# SPEC-003 — Calendario y alertas internas

| Campo | Valor |

| --- | --- |

| Proyecto | Sistema de Planificación y Control de Vacaciones Decembrinas |

| Identificador | SPEC-003 |

| Versión | 0.2 |

| Estado | Aprobada |

| Documentos relacionados | SPEC-001 v0.1 y SPEC-002 v0.2 |

## 1. Propósito

Definir el funcionamiento del calendario y las alertas internas para visualizar actividades, identificar compromisos próximos, detectar actividades vencidas y señalar actividades de prioridad alta.

## 2. Calendario

### 2.1. Vistas

El sistema dispondrá de tres vistas:

- Diaria.

- Semanal.

- Mensual.

### 2.2. Requisitos funcionales

| ID | Requisito |

| --- | --- |

| RF-CAL-001 | Visualizar las actividades en un calendario. |

| RF-CAL-002 | Cambiar entre vistas diaria, semanal y mensual. |

| RF-CAL-003 | Navegar entre fechas, semanas y meses. |

| RF-CAL-004 | Mostrar las actividades del período seleccionado. |

| RF-CAL-005 | Identificar cada actividad mediante su nombre y datos principales. |

| RF-CAL-006 | Consultar el detalle de una actividad desde el calendario. |

| RF-CAL-007 | Identificar visualmente el estado de las actividades. |

| RF-CAL-008 | Identificar visualmente la prioridad. |

| RF-CAL-009 | Mostrar actividades de varios días en todas las fechas correspondientes. |

| RF-CAL-010 | Filtrar por categoría, prioridad, fecha y estado. |

| RF-CAL-011 | Actualizar la visualización después de crear, editar o eliminar actividades. |

| RF-CAL-012 | Respetar la independencia de los períodos vacacionales. |

### 2.3. Información del calendario

Se deberá poder consultar:

- Nombre de la actividad.

- Categoría.

- Fecha de inicio y finalización.

- Hora de inicio y finalización.

- Prioridad.

- Estado.

Las actividades de varios días conservarán un único registro e identificador, aunque aparezcan representadas en varias fechas.

### 2.4. Filtros

| Filtro | Valores |

| --- | --- |

| Categoría | Viajes, Transporte, Alojamiento, Recreación, Turismo, Reuniones familiares y Otros. |

| Prioridad | Alta, Media y Baja. |

| Fecha | Fecha específica o intervalo. |

| Estado | Pendiente, En progreso, Completada y Cancelada. |

Los filtros podrán combinarse.

## 3. Alertas internas

### 3.1. Tipos

| Tipo | Condición |

| --- | --- |

| Próxima | Actividad cuyo inicio está a 24 horas. |

| Vencida | Actividad que superó su fecha programada y continúa Pendiente o En progreso. |

| Prioridad alta | Actividad con prioridad Alta y estado Pendiente o En progreso. |

### 3.2. Alertas próximas

- Se generarán con 24 horas de anticipación respecto al inicio programado.

- Se utilizarán la fecha y hora de inicio.

- No se generarán para actividades Completadas o Canceladas.

### 3.3. Alertas vencidas

Se aplicarán las reglas aprobadas en SPEC-002:

- Actividad de un día: vencida al finalizar su fecha programada.

- Actividad de varios días: vencida al finalizar su fecha de finalización.

- Solo se consideran actividades Pendientes o En progreso.

- Las actividades Completadas o Canceladas nunca generan alertas de vencimiento.

### 3.4. Alertas de prioridad alta

- Se generarán desde que una actividad se registre con prioridad Alta.

- Se mantendrán mientras la actividad continúe Pendiente o En progreso y conserve prioridad Alta.

- No se generarán para actividades Completadas o Canceladas.

- Si cambia la prioridad o el estado, se reevaluará la condición.

## 4. Gestión de alertas

### 4.1. Datos

Cada alerta deberá contener:

| Campo | Descripción |

| --- | --- |

| ID | Identificador único. |

| Actividad | Actividad que originó la alerta. |

| Tipo | Próxima, vencida o prioridad alta. |

| Fecha de generación | Momento en que se generó. |

| Estado de revisión | Pendiente o Revisada. |

| Fecha de revisión | Momento en que fue revisada, cuando corresponda. |

| Historial de revisión | Registro de las revisiones realizadas y sus fechas. |

La estructura definitiva se establecerá en DATA-001.

### 4.2. Requisitos funcionales

| ID | Requisito |

| --- | --- |

| RF-ALT-001 | Identificar actividades próximas con 24 horas de anticipación. |

| RF-ALT-002 | Identificar actividades vencidas conforme a SPEC-002. |

| RF-ALT-003 | Identificar actividades de prioridad Alta. |

| RF-ALT-004 | Consultar alertas pendientes. |

| RF-ALT-005 | Consultar alertas revisadas. |

| RF-ALT-006 | Marcar alertas como revisadas. |

| RF-ALT-007 | Conservar el historial de revisión mientras se mantenga el registro de la alerta. |

| RF-ALT-008 | Reevaluar las alertas cuando cambien las condiciones de la actividad. |

| RF-ALT-009 | Excluir actividades Completadas o Canceladas de las alertas de vencimiento y prioridad alta. |

| RF-ALT-010 | Actualizar las alertas cuando se modifique una actividad. |

| RF-ALT-011 | Eliminar todas las alertas asociadas cuando se elimine definitivamente una actividad. |

| RF-ALT-012 | Evitar alertas activas duplicadas para una misma actividad y tipo. |

| RF-ALT-013 | Recuperar la alerta anterior cuando su condición vuelva a cumplirse, conservando su historial de revisión. |

| RF-ALT-014 | Evaluar las condiciones de las alertas al abrir la aplicación. |

### 4.3. Estados de revisión

- Pendiente.

- Revisada.

Una alerta revisada dejará de aparecer en la lista de alertas pendientes. Su registro se conservará mientras la condición que la originó siga vigente.

Marcar una alerta como revisada no modificará el estado de la actividad.

### 4.4. Recuperación de alertas

Cuando una condición deje de cumplirse:

- La alerta dejará de estar activa.

- Se conservará el registro histórico mientras exista la actividad.

- Si la condición vuelve a cumplirse, se recuperará la alerta anterior.

- No se creará un registro duplicado.

- Se conservará el historial de revisión.

El estado de revisión que deberá tener la alerta recuperada se encuentra pendiente de confirmación.

### 4.5. Prevención de duplicados

Se permitirá una sola alerta activa por combinación de actividad y tipo de alerta.

Mientras la condición permanezca vigente, la evaluación repetida no deberá crear nuevas alertas.

### 4.6. Evaluación al abrir la aplicación

Las alertas se evaluarán al abrir la aplicación.

El sistema deberá:

- Consultar las actividades del período correspondiente.

- Evaluar las condiciones de próximas, vencidas y prioridad alta.

- Identificar las alertas que deban activarse.

- Recuperar registros anteriores cuando corresponda.

- Desactivar las alertas cuyas condiciones hayan dejado de cumplirse.

- Evitar duplicados.

- Actualizar la información presentada al usuario.

No se implementará un proceso permanente en segundo plano para evaluar alertas mientras la aplicación esté cerrada.

### 4.7. Eliminación de actividades

Al eliminar una actividad:

- Se eliminarán sus alertas activas.

- Se eliminarán sus alertas revisadas.

- Se eliminará su historial de revisión.

- No quedarán registros de alertas vinculados a una actividad inexistente.

## 5. Exclusiones

No se incluirán:

- Sincronización con calendarios externos.

- Envío de correos electrónicos.

- Notificaciones por WhatsApp o Telegram.

- Notificaciones push del navegador.

- Integraciones externas de mensajería.

- Procesos permanentes en segundo plano para evaluar alertas.

Las alertas serán internas a la aplicación.

## 6. Criterios de aceptación

### Calendario

- CA-CAL-001: Se puede consultar el calendario en vistas diaria, semanal y mensual.

- CA-CAL-002: Se muestran las actividades del período seleccionado.

- CA-CAL-003: Las actividades de varios días aparecen en todas las fechas correspondientes.

- CA-CAL-004: Los filtros permiten combinar categoría, prioridad, fecha y estado.

- CA-CAL-005: Se identifican visualmente estado y prioridad.

- CA-CAL-006: Los cambios de actividades se reflejan en el calendario.

### Alertas

- CA-ALT-001: Se genera una alerta próxima con 24 horas de anticipación.

- CA-ALT-002: Las actividades vencidas se identifican según SPEC-002.

- CA-ALT-003: Las actividades de prioridad Alta generan alertas desde su registro mientras estén Pendientes o En progreso.

- CA-ALT-004: Las actividades Completadas o Canceladas no generan alertas de vencimiento ni de prioridad alta.

- CA-ALT-005: El usuario puede marcar una alerta como revisada.

- CA-ALT-006: Las alertas revisadas dejan de aparecer en la lista de pendientes.

- CA-ALT-007: El historial de revisión se conserva mientras exista la alerta.

- CA-ALT-008: Los cambios en una actividad provocan la reevaluación de sus alertas.

- CA-ALT-009: No existen alertas activas duplicadas para una misma actividad y tipo.

- CA-ALT-010: Si una condición vuelve a cumplirse, se recupera el registro anterior.

- CA-ALT-011: Al abrir la aplicación se evalúan las condiciones de las alertas.

- CA-ALT-012: Al eliminar una actividad se eliminan sus alertas y su historial.

## 7. Dependencias documentales

- SPEC-001: Requisitos funcionales generales.

- SPEC-002: Gestión de períodos vacacionales y actividades.

- SPEC-004: Presupuestos y gastos.

- SPEC-005: Dashboard e informes.

- SPEC-006: Requisitos no funcionales.

- DATA-001: Modelos y estructura JSON.

- API-001: Contratos de API.

- UI-001: Identidad visual y componentes.

## 8. Decisiones pendientes

| ID | Tema | Definición requerida |

| --- | --- | --- |

| DP-CAL-001 | Primera vista | Vista que se mostrará al abrir el calendario. |

| DP-CAL-002 | Navegación inicial | Fecha que se seleccionará al entrar en un período. |

| DP-CAL-003 | Canceladas | Si se mostrarán por defecto en el calendario. |

| DP-ALT-001 | Reactivación | Estado de revisión de una alerta recuperada después de que su condición desapareció y volvió a cumplirse. |

## 9. Control de cambios

| Versión | Estado | Descripción |

| --- | --- | --- |

| 0.1 | Borrador | Primera versión de calendario y alertas. |

| 0.2 | Borrador actualizado | Incorpora decisiones DEC-022 a DEC-026 y criterios de evaluación al abrir la aplicación. |

Aprobación: pendiente de revisión de la usuaria.

Regla de control: los puntos pendientes no se consideran decisiones aprobadas. No se implementarán comportamientos adicionales sin validación.

DEC-027 — Recuperación de alertas revisadas

Cuando la condición de una alerta desaparezca y posteriormente vuelva a cumplirse:

- Se recuperará la alerta conservando su estado Revisada.

- Se conservará el historial de revisiones anteriores.

- No volverá a aparecer entre las alertas pendientes.

- No se creará una alerta duplicada.

Esta decisión complementa DEC-023 y DEC-024.
