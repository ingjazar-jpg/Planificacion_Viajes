# SPEC-005 — Dashboard e informes

Proyecto: Sistema de Planificación y Control de Vacaciones Decembrinas
Versión: 0.2
Estado: Aprobada
Fecha: 13 de noviembre de 2026

## 1. Propósito

Definir los requisitos funcionales del dashboard y los informes del sistema, permitiendo visualizar el estado general de cada período vacacional, el cumplimiento de las actividades, la ejecución presupuestaria y los resultados históricos.

## 2. Alcance

El módulo incluirá:

- Dashboard general del período seleccionado.

- Indicadores de actividades.

- Indicadores de cumplimiento.

- Resumen presupuestario y de gastos.

- Visualizaciones gráficas.

- Resumen de alertas pendientes.

- Informes consolidados de actividades y presupuesto.

- Consultas históricas por período.

- Comparación entre dos períodos.

- Exportación de informes a PDF y Excel.

## 3. Reglas de negocio

### RN-001. Información independiente

El dashboard y los informes presentarán información correspondiente al período seleccionado, sin mezclar registros de períodos diferentes.

### RN-002. Período inicial del dashboard

Al abrir el dashboard se seleccionará automáticamente el último período creado.

El usuario podrá cambiar al período que desee consultar.

### RN-003. Cumplimiento de actividades

Se utilizará la fórmula aprobada en SPEC-001 y SPEC-002:

Cumplimiento (%) = Completadas / (Total planificadas − Canceladas) × 100.

Cuando no existan actividades elegibles, se mostrará 0 %.

### RN-004. Estados de actividades

Se utilizarán los estados aprobados:

- Pendiente.

- En progreso.

- Completada.

- Cancelada.

### RN-005. Información presupuestaria

Se utilizarán los cálculos aprobados en SPEC-004:

- Saldo general = Presupuesto general − Total de gastos.

- Saldo por categoría = Presupuesto asignado − Gastos de la categoría.

- Ejecución presupuestaria (%) = (Total de gastos / Presupuesto general) × 100.

Cuando el presupuesto general sea cero, la ejecución se mostrará como 0 %.

### RN-006. Categorías

Se utilizarán las siete categorías compartidas por actividades y presupuestos:

- Viajes.

- Transporte.

- Alojamiento.

- Recreación.

- Turismo.

- Reuniones familiares.

- Otros.

### RN-007. Actividades canceladas en informes

Las actividades canceladas se incluirán en los informes, diferenciadas visualmente de los demás estados.

### RN-008. Alertas en dashboard

El dashboard mostrará exclusivamente las alertas pendientes, diferenciadas por tipo:

- Próximas.

- Vencidas.

- Prioridad alta.

Se respetarán las reglas de generación, revisión y recuperación definidas en SPEC-003.

### RN-009. Comparación histórica

El sistema permitirá seleccionar dos períodos y presentar sus indicadores comparativamente, lado a lado.

### RN-010. Indicadores comparativos

La comparación histórica incluirá:

- Presupuesto general.

- Total de gastos.

- Saldo disponible.

- Porcentaje de ejecución presupuestaria.

No se incluirán indicadores de actividades en esta comparación.

### RN-011. Filtros

Los informes permitirán combinar los siguientes filtros, según la información aplicable:

- Fecha.

- Categoría.

- Estado.

- Actividad.

- Prioridad.

### RN-012. Exportación

Los informes podrán exportarse en PDF o Excel.

El formato estará disponible para selección al exportar cada informe.

### RN-013. Alcance de exportación

Al exportar un informe, el usuario podrá elegir entre:

- Exportar únicamente los resultados que cumplen los filtros aplicados.

- Exportar la información completa del período.

### RN-014. Información histórica

El sistema permitirá consultar períodos anteriores sin modificar sus registros.

## 4. Requisitos funcionales

### 4.1 Dashboard

- RF-001: Mostrar automáticamente el último período creado al abrir el dashboard.

- RF-002: Permitir seleccionar otro período disponible.

- RF-003: Mostrar el presupuesto general.

- RF-004: Mostrar el total de gastos registrados.

- RF-005: Mostrar el saldo general disponible.

- RF-006: Mostrar el porcentaje de ejecución presupuestaria.

- RF-007: Mostrar el total de actividades.

- RF-008: Mostrar actividades por estado.

- RF-009: Mostrar el porcentaje de cumplimiento.

- RF-010: Mostrar actividades vencidas.

- RF-011: Mostrar un resumen de alertas pendientes.

- RF-012: Diferenciar las alertas próximas, vencidas y de prioridad alta.

- RF-013: Mostrar la distribución presupuestaria por categoría.

- RF-014: Mostrar los gastos por categoría.

### 4.2 Informes

- RF-015: Generar un informe general del período.

- RF-016: Generar un informe de actividades.

- RF-017: Generar un informe presupuestario y de gastos.

- RF-018: Consultar el cumplimiento de actividades.

- RF-019: Consultar actividades incluyendo las canceladas.

- RF-020: Consultar gastos agrupados por categoría.

- RF-021: Consultar gastos agrupados por actividad.

- RF-022: Consultar los resultados históricos por período.

- RF-023: Permitir combinar filtros de fecha, categoría, estado, actividad y prioridad, según corresponda.

- RF-024: Permitir consultar el detalle de las actividades con los campos definidos en RN-015.

- RF-025: Mostrar totales y porcentajes correspondientes a cada informe.

### 4.3 Comparación histórica

- RF-026: Permitir seleccionar dos períodos disponibles.

- RF-027: Presentar los indicadores de ambos períodos lado a lado.

- RF-028: Comparar presupuesto general, gastos, saldo y ejecución presupuestaria.

- RF-029: Mantener separados los registros originales de cada período.

### 4.4 Visualizaciones

- RF-030: Presentar indicadores mediante tarjetas estadísticas.

- RF-031: Mostrar actividades por estado mediante un gráfico de dona.

- RF-032: Mostrar presupuesto frente a gastos por categoría mediante un gráfico de barras.

- RF-033: Mostrar gastos por categoría mediante un gráfico de barras.

- RF-034: Mostrar el cumplimiento general mediante un indicador visual.

- RF-035: Mantener coherencia entre los datos del dashboard y los informes.

### 4.5 Exportación

- RF-036: Permitir exportar cada informe en PDF.

- RF-037: Permitir exportar cada informe en Excel.

- RF-038: Permitir seleccionar el formato de exportación.

- RF-039: Permitir exportar los resultados filtrados.

- RF-040: Permitir exportar la información completa del período.

- RF-041: Incluir los totales y porcentajes correspondientes a la información exportada.

## 5. Indicadores del dashboard

### 5.1 Indicadores de actividades

- Total de actividades.

- Actividades pendientes.

- Actividades en progreso.

- Actividades completadas.

- Actividades canceladas.

- Actividades vencidas.

- Porcentaje de cumplimiento.

### 5.2 Indicadores presupuestarios

- Presupuesto general.

- Total de gastos.

- Saldo disponible.

- Porcentaje de ejecución.

- Presupuesto asignado por categoría.

- Gastos por categoría.

- Saldo por categoría.

- Categorías con sobreejecución.

### 5.3 Indicadores de alertas

- Alertas próximas pendientes.

- Alertas vencidas pendientes.

- Alertas de prioridad alta pendientes.

## 6. Informes

### 6.1 Informe general

Presentará un resumen del período:

- Nombre y año del período.

- Presupuesto general.

- Total gastado.

- Saldo disponible.

- Ejecución presupuestaria.

- Total de actividades.

- Actividades por estado.

- Cumplimiento general.

- Resumen de resultados.

### 6.2 Informe de actividades

Presentará:

- Nombre de la actividad.

- Categoría.

- Destino.

- Fecha de inicio y finalización.

- Horario de inicio y finalización.

- Prioridad.

- Estado.

Incluirá actividades canceladas, diferenciadas visualmente.

### 6.3 Informe presupuestario y de gastos

Presentará:

- Presupuesto general.

- Presupuesto asignado por categoría.

- Gastos ejecutados por categoría.

- Saldo por categoría.

- Total de gastos del período.

- Saldo general.

- Porcentaje de ejecución.

- Categorías con sobreejecución.

- Detalle de gastos agrupados por categoría y actividad.

## 7. Comparación histórica

La comparación permitirá seleccionar dos períodos y presentar lado a lado:

| Indicador | Período A | Período B |

| --- | --- | --- |

| Presupuesto general | Importe | Importe |

| Total de gastos | Importe | Importe |

| Saldo disponible | Importe | Importe |

| Ejecución presupuestaria | Porcentaje | Porcentaje |

Los datos de actividades no formarán parte de esta comparación.

## 8. Criterios de aceptación

- El dashboard abre inicialmente el último período creado.

- Se puede seleccionar cualquier período disponible.

- Los indicadores respetan las fórmulas aprobadas.

- Las actividades se contabilizan según sus estados reales.

- Las actividades canceladas aparecen en los informes, diferenciadas.

- El dashboard muestra solo alertas pendientes y las clasifica por tipo.

- Los gráficos representan los datos almacenados.

- Se pueden generar los tres informes definidos.

- Los informes permiten combinar los filtros aplicables.

- Los informes muestran el detalle de actividades establecido.

- Se pueden consultar dos períodos y compararlos lado a lado.

- La comparación histórica presenta los cuatro indicadores aprobados.

- Se puede seleccionar PDF o Excel para exportar cada informe.

- Se puede elegir entre exportar resultados filtrados o el período completo.

- Los informes incluyen sus totales y porcentajes correspondientes.

- Los resultados del dashboard coinciden con los correspondientes informes.

- Los datos históricos no se modifican durante las consultas.

## 9. Dependencias

- SPEC-001: Requisitos generales.

- SPEC-002: Períodos y actividades.

- SPEC-003: Calendario y alertas.

- SPEC-004: Presupuestos y gastos.

- SPEC-006: Requisitos no funcionales.

- ARCH-001: Arquitectura técnica.

- DATA-001: Modelos y estructura JSON.

- API-001: Contratos REST.

- UI-001: Identidad visual y componentes.

## Control de consistencia

Antes de aprobar, dejo identificados dos detalles para no introducir reglas implícitas:

- La comparación histórica de SPEC-005 se limita a cuatro indicadores presupuestarios; no compara actividades ni cumplimiento.

- La exportación a Excel y PDF está definida funcionalmente, pero la tecnología y el diseño exacto de los archivos se resolverán en la arquitectura y el diseño de interfaz.
