# SPEC-001 — Especificación funcional general

| Campo | Valor |

| --- | --- |

| Proyecto | Sistema de Planificación y Control de Vacaciones Decembrinas |

| Identificador | SPEC-001 |

| Versión | 0.1 |

| Estado | Aprobada |

| Metodología | Spec-Driven Development (SDD) |

| Moneda | Peso colombiano (COP) |

| Persistencia | Archivo JSON local |

## 1. Propósito

Definir los requisitos funcionales generales de una aplicación web que permita planificar, organizar y controlar las vacaciones decembrinas mediante la gestión de períodos, actividades, calendario, alertas internas, presupuestos, gastos, indicadores e informes históricos.

Este documento establece el alcance general y sirve como referencia para las especificaciones detalladas de cada módulo.

## 2. Objetivo del producto

Proporcionar una herramienta centralizada que permita:

- Planificar actividades y viajes de cada período vacacional.

- Consultar las actividades en un calendario.

- Identificar actividades próximas, vencidas y pendientes de atención.

- Definir y controlar presupuestos por período y categoría.

- Registrar y analizar los gastos realizados.

- Consultar indicadores de planificación y ejecución.

- Generar informes históricos por período y año.

## 3. Alcance funcional

El sistema incluirá los siguientes módulos:

- Períodos vacacionales: creación y consulta de períodos independientes por año, con fechas personalizables.

- Actividades: registro, consulta, edición y eliminación de actividades.

- Calendario: visualización diaria, semanal y mensual de las actividades.

- Alertas internas: identificación de actividades próximas, vencidas y de prioridad alta; seguimiento de alertas revisadas.

- Presupuestos: definición de un presupuesto general y distribución por categorías.

- Gastos: registro, consulta, edición y eliminación de gastos.

- Dashboard: presentación de indicadores, resúmenes y gráficos.

- Informes: consulta de resultados históricos por período y año.

## 4. Requisitos funcionales generales

| ID | Requisito |

| --- | --- |

| RF-001 | El sistema permitirá crear y administrar períodos vacacionales independientes por año. |

| RF-002 | Cada período tendrá fechas de inicio y finalización personalizables. |

| RF-003 | Las actividades, presupuestos y gastos pertenecerán a un período determinado. |

| RF-004 | El sistema permitirá gestionar actividades con sus datos descriptivos, fechas, horarios, categorías, prioridades y estados. |

| RF-005 | El sistema permitirá consultar las actividades mediante un calendario diario, semanal y mensual. |

| RF-006 | El sistema generará alertas internas conforme a las reglas definidas para actividades próximas, vencidas y de prioridad alta. |

| RF-007 | El usuario podrá marcar alertas como revisadas. |

| RF-008 | El sistema permitirá definir un presupuesto general por período y distribuirlo entre categorías. |

| RF-009 | El sistema permitirá registrar gastos asociados opcionalmente a una actividad. |

| RF-010 | El sistema calculará los valores de ejecución presupuestaria y saldos. |

| RF-011 | El dashboard presentará indicadores de actividades, cumplimiento, presupuesto y gastos. |

| RF-012 | El sistema permitirá consultar informes por período y año. |

| RF-013 | El sistema conservará los datos al cerrar y reiniciar la aplicación. |

| RF-014 | El sistema permitirá consultar información de períodos anteriores sin mezclar sus datos con los períodos actuales. |

## 5. Reglas de negocio generales aprobadas

### 5.1. Períodos vacacionales

- Cada año tendrá su propio período vacacional independiente.

- Las fechas de inicio y finalización serán personalizables.

- Cada período tendrá sus propias actividades, presupuesto y gastos.

- La información de un período no deberá alterar los resultados de otro.

### 5.2. Actividades

Estados permitidos:

- Pendiente.

- En progreso.

- Completada.

- Cancelada.

Prioridades permitidas:

- Alta.

- Media.

- Baja.

Categorías iniciales:

- Viajes.

- Transporte.

- Alojamiento.

- Recreación.

- Turismo.

- Reuniones familiares.

- Otros.

Una actividad podrá tener destino opcional, descripción, fechas, horarios y demás datos definidos en SPEC-002.

Regla de vencimiento:

- Una actividad de un día se considerará vencida al finalizar su fecha programada.

- Una actividad de varios días se considerará vencida al finalizar su fecha de terminación.

- La regla se aplicará únicamente a actividades pendientes o en progreso.

- Las actividades completadas o canceladas nunca se considerarán vencidas.

### 5.3. Cumplimiento de actividades

Fórmula aprobada:

Cumplimiento (%) =

[
\frac{\text{Actividades completadas}}
{\text{Total de actividades planificadas - Actividades canceladas}}
\times 100
]

El tratamiento del caso en que el denominador sea cero queda pendiente de definición.

### 5.4. Alertas

- Las alertas de próximas actividades se generarán con 24 horas de anticipación.

- Las alertas podrán marcarse como revisadas.

- Una alerta revisada dejará de aparecer en la lista de alertas pendientes.

- El sistema conservará su registro como revisada mientras la condición que la originó siga vigente.

- Si cambia la condición de la actividad, el sistema reevaluará la alerta.

- Las actividades completadas o canceladas no generarán alertas de vencimiento.

### 5.5. Presupuestos

- Cada período tendrá un presupuesto general independiente.

- El presupuesto podrá distribuirse entre categorías.

- La suma de los presupuestos asignados a categorías no podrá superar el presupuesto general.

Regla:

[
\sum \text{Presupuestos por categoría}
\leq \text{Presupuesto general}
]

Categorías presupuestarias iniciales:

- Transporte.

- Alojamiento.

- Alimentación.

- Recreación.

- Otros.

### 5.6. Gastos

- Cada gasto pertenecerá a un período vacacional.

- La asociación con una actividad será opcional.

- Un gasto podrá asociarse a cualquier actividad, sin restricción por categoría.

- La categoría del gasto será independiente de la categoría de la actividad.

- Los importes se manejarán en pesos colombianos (COP).

### 5.7. Eliminación de registros

- Las actividades y los gastos podrán eliminarse definitivamente.

- No se implementará papelera de recuperación.

- Las reglas específicas para eliminar períodos con información asociada se definirán antes de su implementación.

## 6. Requisitos no funcionales generales

| ID | Requisito |

| --- | --- |

| RNF-001 | La aplicación será web y tendrá interfaz adaptable a dispositivos de escritorio, tabletas y móviles. |

| RNF-002 | El backend se desarrollará con Python, FastAPI y Pydantic. |

| RNF-003 | El frontend se desarrollará con React, Vite, JavaScript/JSX, HTML5 y CSS3. |

| RNF-004 | La persistencia se realizará exclusivamente mediante archivos JSON locales administrados por el backend. |

| RNF-005 | El archivo principal de datos será datos_vacaciones.json. |

| RNF-006 | El frontend no tendrá acceso directo de lectura o escritura al archivo JSON. |

| RNF-007 | Las validaciones de negocio se implementarán en el backend; el frontend podrá incorporar validaciones complementarias para mejorar la experiencia. |

| RNF-008 | Los cálculos monetarios deberán mantener precisión decimal y utilizar COP. |

| RNF-009 | La aplicación deberá gestionar errores de validación, persistencia y operaciones de forma controlada. |

| RNF-010 | El código se organizará modularmente para facilitar mantenimiento y pruebas. |

| RNF-011 | La aplicación deberá conservar la integridad de los datos durante las operaciones de escritura. |

| RNF-012 | Se deberán implementar pruebas para reglas de negocio, cálculos, validaciones, operaciones CRUD y persistencia. |

## 7. Restricciones tecnológicas y de alcance

- No se utilizará una base de datos externa.

- No se utilizarán Bootstrap ni Tailwind CSS.

- No se permitirá que el frontend manipule directamente los archivos JSON.

- No se incorporarán integraciones externas de calendario, mapas, mensajería o notificaciones sin autorización expresa.

- Las alertas serán internas a la aplicación.

- No se incorporarán funcionalidades del sistema de compras navideñas ni del sistema de gastos personales.

- El Proyecto 3 será independiente del Programa 1 y del Proyecto 2.

- Se reutilizarán patrones visuales y componentes compatibles del Programa 1, sin modificar su repositorio ni acoplar las reglas de negocio.

## 8. Criterios de aceptación generales

- CA-001: Se pueden crear y consultar períodos vacacionales independientes.

- CA-002: Cada período conserva sus propias actividades, presupuestos y gastos.

- CA-003: Las fechas de los períodos pueden personalizarse.

- CA-004: Las actividades pueden gestionarse y visualizarse en el calendario.

- CA-005: Las reglas de vencimiento respetan el estado y las fechas de cada actividad.

- CA-006: Las alertas próximas se generan con 24 horas de anticipación y permiten marcarse como revisadas.

- CA-007: La suma de presupuestos por categoría nunca supera el presupuesto general.

- CA-008: Los gastos pueden registrarse con o sin actividad relacionada.

- CA-009: Los indicadores y reportes reflejan los datos del período consultado.

- CA-010: Los datos persisten después de reiniciar la aplicación.

- CA-011: Las operaciones inválidas son rechazadas y presentan errores controlados.

- CA-012: La aplicación funciona en resoluciones de escritorio y móviles.

## 9. Dependencias documentales

Este documento se complementará con:

- SPEC-002: Períodos y actividades.

- SPEC-003: Calendario y alertas.

- SPEC-004: Presupuestos y gastos.

- SPEC-005: Dashboard e informes.

- SPEC-006: Requisitos no funcionales.

- ARCH-001: Arquitectura técnica.

- DATA-001: Modelos y estructura JSON.

- API-001: Contratos de API.

- UI-001: Identidad visual y componentes.

## 10. Decisiones pendientes de especificación

Los siguientes puntos no se consideran aprobados ni implementables hasta su definición:

- Resultado del indicador de cumplimiento cuando no existan actividades elegibles.

- Reglas para eliminar un período que contenga actividades o gastos.

- Comportamiento ante fechas de actividades fuera del período vacacional.

- Reglas de validación de solapamiento de fechas y horarios.

- Reglas de integridad y recuperación ante errores de escritura JSON.

- Criterios de consulta, filtros y exportación de informes.

## 11. Control de cambios

| Versión | Estado | Descripción |

| --- | --- | --- |

| 0.1 | Borrador | Primera consolidación de objetivos, alcance, requisitos generales y decisiones confirmadas. |

Aprobación: pendiente de revisión de la usuaria.

Regla de control: ninguna funcionalidad podrá considerarse aprobada únicamente por aparecer en este borrador. La aprobación formal de SPEC-001 deberá preceder a su consolidación como fuente de verdad del proyecto.
