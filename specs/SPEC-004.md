# SPEC-004 — Presupuestos y gastos

Proyecto: Sistema de Planificación y Control de Vacaciones Decembrinas
Versión: 0.2 — Borrador consolidado
Estado: Pendiente de aprobación
Fecha: 13 de noviembre de 2026

## 1. Propósito

Definir las reglas funcionales para planificar y controlar el presupuesto de cada período vacacional, distribuirlo por categorías, registrar gastos y consultar la ejecución presupuestaria.

## 2. Alcance

El módulo permitirá:

- Configurar el presupuesto general de cada período.

- Distribuir el presupuesto entre categorías.

- Registrar gastos asociados o no a actividades.

- Editar y eliminar gastos.

- Consultar gastos por período, categoría y actividad.

- Calcular importes ejecutados, saldos y porcentajes de ejecución.

- Consultar el historial de modificaciones de gastos.

- Mantener independientes los presupuestos de cada período.

## 3. Reglas de negocio

### RN-001. Presupuesto independiente por período

Cada período vacacional tendrá un presupuesto general independiente.

### RN-002. Distribución por categorías

La suma de los presupuestos asignados a las categorías no podrá superar el presupuesto general del período.

### RN-003. Categorías presupuestarias

Se utilizarán las mismas categorías definidas en SPEC-002:

- Viajes

- Transporte

- Alojamiento

- Recreación

- Turismo

- Reuniones familiares

- Otros

DEC-028: Las categorías presupuestarias y las categorías de actividades compartirán la misma clasificación.

### RN-004. Asociación de gastos

La asociación de un gasto con una actividad será opcional.

Un gasto podrá registrarse:

- Asociado a una actividad del período.

- Sin actividad asociada.

Todo gasto deberá tener una categoría presupuestaria.

La categoría del gasto será independiente de la categoría de la actividad asociada. No se restringirá la asociación por diferencias entre ambas categorías.

### RN-005. Cantidad de gastos por actividad

Una actividad podrá tener múltiples gastos asociados, sin límite establecido.

### RN-006. Datos del gasto

Cada gasto contendrá:

| Campo | Obligatorio |

| --- | --- |

| Nombre o concepto | Sí |

| Descripción | No |

| Importe | Sí |

| Fecha del gasto | Sí |

| Categoría presupuestaria | Sí |

| Actividad asociada | No |

| Observaciones | No |

### RN-007. Edición de gastos

Se permitirá editar todos los campos de un gasto registrado, aplicando las validaciones correspondientes.

### RN-008. Eliminación de gastos

Se permitirá eliminar gastos definitivamente.

La eliminación no conservará el gasto como registro activo.

### RN-009. Eliminación de actividades

Al eliminar una actividad, todos sus gastos asociados también se eliminarán definitivamente, conforme a SPEC-002.

### RN-010. Moneda

Todos los importes se manejarán en pesos colombianos (COP).

### RN-011. Cálculo del saldo general

El saldo general disponible se calculará mediante:

Saldo general = Presupuesto general − Total de gastos registrados.

También se mostrará el presupuesto distribuido entre categorías, para distinguir la planificación de la ejecución real.

### RN-012. Cálculo del saldo por categoría

Para cada categoría:

Saldo de categoría = Presupuesto asignado − Gastos registrados en la categoría.

El saldo podrá ser negativo cuando los gastos superen el presupuesto asignado.

### RN-013. Gastos superiores al presupuesto de categoría

Se permitirá registrar gastos que superen el presupuesto disponible de su categoría.

El sistema mostrará una advertencia de sobreejecución, pero no bloqueará el registro.

### RN-014. Gastos superiores al presupuesto general

Se permitirá registrar gastos que superen el saldo general disponible.

El sistema mostrará una advertencia de sobreejecución, pero no bloqueará el registro.

### RN-015. Modificación del presupuesto general

El presupuesto general podrá modificarse después de registrar gastos.

El sistema permitirá el cambio y mostrará advertencias cuando el nuevo presupuesto resulte inferior al total de gastos ejecutados.

### RN-016. Modificación de presupuestos por categoría

Los presupuestos asignados a las categorías podrán modificarse después de registrar gastos.

Se permitirá que el nuevo presupuesto de una categoría sea inferior al gasto ejecutado, mostrando una advertencia de sobreejecución.

La suma de presupuestos por categoría deberá continuar respetando el presupuesto general.

### RN-017. Reducción del presupuesto general

Cuando se reduzca el presupuesto general y la suma de los presupuestos asignados por categoría supere el nuevo importe, el sistema deberá exigir que se ajusten primero los presupuestos por categoría.

No se permitirá guardar una distribución que incumpla RN-002.

### RN-018. Corrección de gastos

Los gastos podrán corregirse mediante:

- Edición del registro original.

- Eliminación definitiva y registro de un nuevo gasto.

### RN-019. Historial de modificaciones

El sistema conservará un historial de modificaciones de los gastos.

El historial registrará:

- Valores anteriores.

- Valores nuevos.

- Fecha de modificación.

- Tipo de modificación.

El historial permitirá consultar los cambios realizados sobre el gasto.

### RN-020. Independencia entre períodos

Los gastos y presupuestos de un período no modificarán los datos de otros períodos.

## 4. Requisitos funcionales

- RF-001: Configurar el presupuesto general de un período.

- RF-002: Asignar presupuestos a las siete categorías.

- RF-003: Validar que la suma de presupuestos por categoría no supere el presupuesto general.

- RF-004: Registrar gastos con los campos definidos en RN-006.

- RF-005: Permitir asociar opcionalmente un gasto con una actividad.

- RF-006: Permitir múltiples gastos por actividad.

- RF-007: Permitir editar todos los campos de un gasto.

- RF-008: Permitir eliminar gastos definitivamente.

- RF-009: Calcular el total de gastos del período.

- RF-010: Calcular el saldo general disponible.

- RF-011: Calcular el total gastado y el saldo de cada categoría.

- RF-012: Mostrar advertencias por sobreejecución presupuestaria.

- RF-013: Permitir modificar el presupuesto general.

- RF-014: Permitir modificar presupuestos por categoría.

- RF-015: Permitir consultar gastos por período.

- RF-016: Permitir filtrar gastos por fecha, categoría, actividad e importe, combinando filtros.

- RF-017: Permitir consultar gastos agrupados por categoría.

- RF-018: Permitir consultar gastos agrupados por actividad.

- RF-019: Consultar el historial de modificaciones de gastos.

- RF-020: Mostrar el porcentaje de ejecución presupuestaria.

- RF-021: Mostrar las categorías que superaron su presupuesto.

- RF-022: Mantener la independencia de los datos entre períodos.

## 5. Indicadores presupuestarios

El módulo deverá mostrar:

- Presupuesto general.

- Presupuesto asignado por categoría.

- Total gastado por categoría.

- Saldo disponible por categoría.

- Total de gastos del período.

- Saldo general disponible.

- Porcentaje de ejecución presupuestaria.

- Categorías con sobreejecución.

El porcentaje de ejecución presupuestaria se calculará mediante:

Ejecución (%) = (Total de gastos registrados / Presupuesto general) × 100

Cuando el presupuesto general sea cero, el porcentaje de ejecución se mostrará como 0 % para evitar una división entre cero.

## 6. Criterios de aceptación

- El sistema permite configurar un presupuesto independiente por período.

- La distribución por categorías no supera el presupuesto general.

- Se utilizan las siete categorías aprobadas en SPEC-002.

- Se pueden registrar gastos con o sin actividad asociada.

- Todo gasto tiene una categoría presupuestaria.

- Se permiten múltiples gastos por actividad.

- La categoría de un gasto no tiene que coincidir con la de su actividad asociada.

- Se pueden editar todos los campos de un gasto.

- Los gastos pueden eliminarse definitivamente.

- Los cambios realizados en un gasto quedan registrados en su historial.

- Se permiten gastos superiores al presupuesto, con advertencias.

- Se pueden modificar los presupuestos después de registrar gastos.

- No se permite guardar una distribución por categorías superior al presupuesto general.

- Los saldos e indicadores se actualizan según los gastos y presupuestos vigentes.

- Se pueden consultar gastos por categoría y por actividad.

- Los filtros pueden combinarse.

- Los datos de períodos diferentes permanecen independientes.

## 7. Dependencias

- SPEC-001: Requisitos generales.

- SPEC-002: Períodos y actividades.

- SPEC-003: Calendario y alertas.

- ARCH-001: Arquitectura técnica.

- DATA-001: Modelos y estructura JSON.

- API-001: Contratos REST.

- UI-001: Identidad visual y componentes.

## 8. Control de consistencia

Hay dos aspectos que conviene dejar explícitos en la siguiente revisión:

- Historial y eliminación definitiva: el historial conserva modificaciones de gastos existentes; la eliminación definitiva no conserva el gasto como registro activo. El tratamiento técnico del historial al eliminar un gasto se deberá mantener coherente con esa regla.

- Reducción de presupuestos: se permiten presupuestos inferiores a los gastos ejecutados, pero nunca una suma de presupuestos por categoría superior al presupuesto general.
